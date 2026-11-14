"""Separate, authenticated Chromium service. No app imports or repository execution."""
import asyncio
import base64
import hmac
import ipaddress
import json
import os
import socket
from urllib.parse import urljoin, urlsplit

from aiohttp import web, ClientSession, TCPConnector, ClientTimeout
from aiohttp.abc import AbstractResolver
from playwright.async_api import async_playwright

TYPES = {"availability", "http_status", "broken_links", "form_behavior", "login_flow", "api_response", "mobile_overflow", "accessibility"}


def origin(url):
    u = urlsplit(url)
    if u.scheme not in {"http", "https"} or not u.hostname or u.username or u.password:
        raise ValueError("Invalid target URL")
    return f"{u.scheme}://{u.netloc.lower()}"


def validate_job(job, allowed):
    if not isinstance(job, dict) or set(job) - {"target", "test_type", "apiPath", "login"}:
        raise ValueError("Invalid job")
    if job.get("test_type") not in TYPES:
        raise ValueError("Unsupported test")
    target = job.get("target", "")
    if not isinstance(target, str) or len(target) > 1000 or origin(target) not in allowed:
        raise ValueError("Target is not on the worker operator's allow-list")
    if not urlsplit(target).path.startswith("/api/public/demo/"):
        raise ValueError("This worker only supports the isolated demo fixture")
    if job.get("apiPath") not in {None, "/api/public/demo/stats"}:
        raise ValueError("Unsupported API path")
    login = job.get("login")
    if login is not None and login != {"path": "/api/public/demo/site/login", "user": "demo@proofchain.ai", "pass": "demo1234"}:
        raise ValueError("Only public fixture login credentials are permitted")
    return job


async def vetted_addresses(host, port, allow_private=False):
    records = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    ips = sorted({r[4][0] for r in records})
    if not ips or (not allow_private and any(not ipaddress.ip_address(ip).is_global for ip in ips)):
        raise ValueError("Private or reserved network addresses are blocked")
    return ips


class PinnedResolver(AbstractResolver):
    def __init__(self, addresses):
        self.addresses = addresses

    async def resolve(self, host, port=0, family=socket.AF_INET):
        return [{"hostname": host, "host": ip, "port": port, "family": socket.AF_INET6 if ":" in ip else socket.AF_INET, "proto": 0, "flags": 0} for ip in self.addresses]

    async def close(self):
        pass


async def execute(job, allowed, allow_private=False):
    validate_job(job, allowed)
    target, kind = job["target"], job["test_type"]
    scope = origin(target)
    logs, errors = ["ENGINE: Chromium / Playwright (executed live)"], []
    request_count = 0
    # Every request, redirect and subresource is mediated. DNS is checked and
    # pinned to the connector, closing the lookup/connect rebinding window.
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, chromium_sandbox=os.getenv("BROWSER_SANDBOX", "true") == "true")
        context = await browser.new_context(viewport={"width": 1280, "height": 900}, service_workers="block", accept_downloads=False)
        await context.route_web_socket("**/*", lambda ws: ws.close())

        async def mediate(route):
            nonlocal request_count
            request_count += 1
            req = route.request
            try:
                if request_count > 40 or origin(req.url) != scope or not urlsplit(req.url).path.startswith("/api/public/demo/"):
                    raise ValueError("Network scope or request budget exceeded")
                if req.method not in {"GET", "HEAD"} and not (kind == "login_flow" and req.method == "POST" and urlsplit(req.url).path == "/api/public/demo/site/login"):
                    raise ValueError("Write request not permitted")
                u = urlsplit(req.url)
                ips = await vetted_addresses(u.hostname, u.port or (443 if u.scheme == "https" else 80), allow_private)
                connector = TCPConnector(resolver=PinnedResolver(ips), use_dns_cache=False)
                async with ClientSession(connector=connector, timeout=ClientTimeout(total=8)) as session:
                    # Never forward browser cookies, authorization or arbitrary headers.
                    headers = {"content-type": req.headers.get("content-type", "application/octet-stream")}
                    async with session.request(req.method, req.url, headers=headers, data=req.post_data_buffer, allow_redirects=False) as response:
                        body = await response.content.read(1_000_001)
                        if len(body) > 1_000_000:
                            raise ValueError("Response exceeded size budget")
                        safe = {k: v for k, v in response.headers.items() if k.lower() in {"content-type", "location"}}
                        await route.fulfill(status=response.status, headers=safe, body=body)
            except Exception as exc:
                errors.append(str(exc))
                await route.abort("blockedbyclient")

        await context.route("**/*", mediate)
        page = await context.new_page()
        page.set_default_timeout(6000)
        page.on("pageerror", lambda e: logs.append(f"PAGE ERROR: {str(e)[:500]}"))
        try:
            response = await page.goto(target, wait_until="networkidle", timeout=12000)
            status = response.status if response else 0
            logs.append(f"Rendered {page.url} → {status}")
            passed, details = False, ""
            if kind in {"availability", "http_status"}:
                text = await page.locator("body").inner_text()
                passed = 200 <= status < 400 and (bool(text.strip()) if kind == "availability" else True)
                details = f"Chromium rendered status {status}; {len(text)} visible characters"
            elif kind == "broken_links":
                links = await page.locator("a[href]").evaluate_all("els => [...new Set(els.map(e => e.href))]")
                links = [l for l in links if origin(l) == scope][:8]
                broken = []
                for link in links:
                    result = await page.goto(link, wait_until="networkidle")
                    code = result.status if result else 0
                    logs.append(f"Browser navigation {link} → {code}; title: {await page.title()}")
                    if not 200 <= code < 400:
                        broken.append(f"{link} ({code})")
                passed = bool(links) and not broken
                details = "Broken navigation: " + "; ".join(broken) if broken else f"{len(links)} links navigated in Chromium"
                if passed:
                    await page.goto(target, wait_until="networkidle")
            elif kind in {"form_behavior", "login_flow"}:
                login = job.get("login")
                if not login:
                    raise ValueError("No fixture login configured")
                login_url = urljoin(target, login["path"])
                await page.goto(login_url, wait_until="networkidle")
                if kind == "form_behavior":
                    await page.locator('input[name="email"]').fill("invalid-email")
                    await page.locator('input[name="password"]').fill("nope")
                    passed = not await page.locator("form").evaluate("form => form.checkValidity()")
                    details = "Rendered form rejects malformed email through browser validation" if passed else "Rendered form accepts malformed email"
                else:
                    for email, password, expected in [("wrong@example.com", "nope", 401), (login["user"], login["pass"], 200)]:
                        await page.goto(login_url, wait_until="networkidle")
                        await page.locator('input[name="email"]').fill(email)
                        await page.locator('input[name="password"]').fill(password)
                        async with page.expect_navigation(wait_until="networkidle") as navigation:
                            await page.get_by_role("button", name="Sign in").click()
                        result = await navigation.value
                        code = result.status if result else 0
                        text = await page.locator("body").inner_text()
                        logs.append(f"Browser submitted {'valid' if expected == 200 else 'invalid'} fixture login → {code}: {text[:160]}")
                        if code != expected or (expected == 200 and "Welcome" not in text):
                            raise ValueError("Fixture login behavior did not match expected status/content")
                    passed, details = True, "Chromium submitted both logins: invalid rejected (401), valid rendered Welcome (200)"
            elif kind == "api_response":
                result = await page.goto(urljoin(target, job.get("apiPath") or "/api/public/demo/stats"), wait_until="networkidle")
                code = result.status if result else 0
                text = await page.locator("body").inner_text()
                try:
                    json.loads(text)
                    is_json = True
                except ValueError:
                    is_json = False
                passed = 200 <= code < 300 and is_json
                details = f"Browser opened API: {code}, {'JSON' if is_json else 'non-JSON'}; {text[:200]}"
            elif kind == "mobile_overflow":
                await page.set_viewport_size({"width": 390, "height": 844})
                await page.reload(wait_until="networkidle")
                widths = await page.evaluate("({viewport:innerWidth, document:document.documentElement.scrollWidth, body:document.body.scrollWidth})")
                passed = max(widths["document"], widths["body"]) <= widths["viewport"] + 1
                details = f"Measured rendered mobile layout: viewport {widths['viewport']}px, content {max(widths['document'], widths['body'])}px"
            elif kind == "accessibility":
                issues = await page.evaluate("""() => {
                  const issues=[];
                  if(!document.documentElement.lang) issues.push('Missing page language');
                  if(!document.title) issues.push('Missing title');
                  if(document.querySelectorAll('img:not([alt])').length) issues.push('Images missing alt');
                  for(const el of document.querySelectorAll('input:not([type=hidden])'))
                    if(!el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) issues.push('Unlabelled input');
                  for(const el of document.querySelectorAll('button'))
                    if(!el.textContent.trim() && !el.getAttribute('aria-label')) issues.push('Unnamed button');
                  return issues;
                }""")
                passed = not issues
                details = "; ".join(issues) if issues else "Rendered DOM basics passed (language, title, image alt, field labels, button names); not a full WCAG audit"
            if errors:
                raise RuntimeError("Browser network policy blocked a request: " + errors[0])
            text = (await page.locator("body").inner_text())[:12000]
            title = (await page.title())[:300]
            shot = await page.screenshot(type="jpeg", quality=65, full_page=False)
            logs.append(details)
            return {"test_type": kind, "target": target, "passed": passed, "details": details, "logs": logs,
                    "page": {"url": page.url, "title": title, "text": text, "viewport": page.viewport_size},
                    "screenshot": base64.b64encode(shot).decode()}
        finally:
            await context.close()
            await browser.close()


def make_app():
    secret = os.environ.get("BROWSER_WORKER_SECRET", "")
    allowed = {origin(u.strip()) for u in os.environ.get("BROWSER_ALLOWED_ORIGINS", "").split(",") if u.strip()}
    if not secret or not allowed:
        raise RuntimeError("Configure BROWSER_WORKER_SECRET and BROWSER_ALLOWED_ORIGINS before starting")
    # Explicit local-only development exception. Never enabled in production.
    private = os.environ.get("BROWSER_ALLOW_LOCAL_TESTS") == "true"
    if private and any(urlsplit(u).hostname not in {"localhost", "127.0.0.1"} for u in allowed):
        raise RuntimeError("Local test exception requires loopback-only origins")
    gate = asyncio.Semaphore(1)
    app = web.Application(client_max_size=8000)

    async def run(request):
        if not hmac.compare_digest(request.headers.get("Authorization", ""), "Bearer " + secret):
            return web.json_response({"error": "Unauthorized"}, status=401)
        if gate.locked():
            return web.json_response({"error": "Worker busy; retry later"}, status=429)
        try:
            job = validate_job(await request.json(), allowed)
        except Exception:
            return web.json_response({"error": "Invalid or unauthorized job"}, status=400)
        async with gate:
            try:
                result = await asyncio.wait_for(execute(job, allowed, private), timeout=45)
                return web.json_response(result)
            except Exception:
                # Execution/infrastructure failures are NOT failed claim tests.
                return web.json_response({"error": "Browser execution unavailable or interrupted; no verdict recorded"}, status=503)

    app.router.add_get("/health", lambda request: web.json_response({"service": "proofchain-browser", "ready": True}))
    app.router.add_post("/run", run)
    return app


if __name__ == "__main__":
    web.run_app(make_app(), host="0.0.0.0", port=int(os.environ.get("PORT", "9000")), print=None)