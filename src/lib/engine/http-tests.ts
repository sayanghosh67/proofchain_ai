// Controlled HTTP checks. No code from targets is ever executed.
export type TestType =
  | "availability"
  | "http_status"
  | "broken_links"
  | "form_behavior"
  | "login_flow"
  | "api_response"
  | "mobile_overflow"
  | "accessibility";

export const TEST_TYPES: TestType[] = [
  "availability",
  "http_status",
  "broken_links",
  "form_behavior",
  "login_flow",
  "api_response",
  "mobile_overflow",
  "accessibility",
];

export type TestOutcome = {
  test_type: TestType;
  target: string;
  passed: boolean;
  details: string;
  logs: string[];
};

const PRIVATE = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?f[cd]/i,
  /\.internal$/i,
  /\.local$/i,
  /^metadata/i,
];

/** SSRF guard: http(s) only, no private hosts, and host must be in the authorized list. */
export function assertAuthorized(url: string, authorizedHosts: string[], selfOrigin?: string): URL {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!["http:", "https:"].includes(u.protocol))
    throw new Error("Only http/https targets are allowed");
  if (u.username || u.password) throw new Error("Credentials in URLs are not allowed");
  const isSelf = selfOrigin && u.origin === selfOrigin;
  if (!isSelf && PRIVATE.some((r) => r.test(u.hostname)))
    throw new Error("Private/internal network targets are blocked");
  if (!authorizedHosts.includes(u.host))
    throw new Error(`Host ${u.host} is not an authorized test target`);
  return u;
}

async function fetchCapped(url: string, init: RequestInit = {}, ms = 8000) {
  const { safeHttp } = await import("./safe-http.server");
  return safeHttp(url, init, ms);
}

const hrefs = (html: string) =>
  [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)].map((m) => m[1]);

export async function runHttpTest(
  type: TestType,
  target: string,
  opts: {
    authorizedHosts: string[];
    selfOrigin?: string | undefined;
    apiPath?: string | undefined;
    login?: { path: string; user: string; pass: string } | undefined;
  },
): Promise<TestOutcome> {
  const logs: string[] = [];
  const done = (passed: boolean, details: string): TestOutcome => ({
    test_type: type,
    target,
    passed,
    details,
    logs,
  });
  try {
    const base = assertAuthorized(target, opts.authorizedHosts, opts.selfOrigin);
    logs.push(`GET ${base.href}`);
    const page = await fetchCapped(base.href);
    logs.push(`→ ${page.status} in ${page.ms}ms, ${page.body.length} bytes`);
    switch (type) {
      case "availability":
        return done(
          page.status < 500 && page.body.length > 0,
          page.status < 500
            ? `Reachable (${page.status}, ${page.ms}ms)`
            : `Server error ${page.status}`,
        );
      case "http_status":
        return done(page.status >= 200 && page.status < 400, `Status ${page.status}`);
      case "broken_links": {
        const links = [...new Set(hrefs(page.body))]
          .filter((h): h is string => !!h)
          .map((h) => new URL(h, base).href)
          .filter((h) => new URL(h).host === base.host)
          .slice(0, 15);
        const broken: string[] = [];
        for (const l of links) {
          assertAuthorized(l, opts.authorizedHosts, opts.selfOrigin);
          const r = await fetchCapped(l, {}, 6000).catch(() => ({ status: 0 }));
          logs.push(`GET ${l} → ${r.status}`);
          if (r.status === 0 || r.status >= 400) broken.push(`${l} (${r.status})`);
        }
        return done(
          broken.length === 0,
          broken.length
            ? `Broken links: ${broken.join(", ")}`
            : `All ${links.length} internal links resolved`,
        );
      }
      case "form_behavior": {
        const forms = page.body.match(/<form\b[\s\S]*?<\/form>/gi) ?? [];
        if (!forms.length) return done(false, "No form found on the page");
        const issues: string[] = [];
        forms.forEach((f, i) => {
          if (!/<(input|textarea|select)\b/i.test(f)) issues.push(`form ${i + 1} has no fields`);
          if (!/type\s*=\s*["']submit|<button/i.test(f))
            issues.push(`form ${i + 1} has no submit control`);
        });
        logs.push(`Found ${forms.length} form(s)`);
        return done(
          issues.length === 0,
          issues.length
            ? issues.join("; ")
            : `${forms.length} form(s) have fields and submit controls`,
        );
      }
      case "login_flow": {
        if (!opts.login)
          return done(false, "No authorized login fixture configured for this target");
        const url = new URL(opts.login.path, base).href;
        assertAuthorized(url, opts.authorizedHosts, opts.selfOrigin);
        const bad = await fetchCapped(url, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: "email=wrong%40x.com&password=nope",
        });
        logs.push(`POST ${url} (invalid creds) → ${bad.status}`);
        const good = await fetchCapped(url, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email: opts.login.user,
            password: opts.login.pass,
          }).toString(),
        });
        logs.push(`POST ${url} (fixture creds) → ${good.status}`);
        const ok = good.status === 200 && /welcome/i.test(good.body) && bad.status === 401;
        return done(
          ok,
          ok
            ? "Valid credentials accepted, invalid rejected with 401"
            : `Unexpected login behavior (valid ${good.status}, invalid ${bad.status})`,
        );
      }
      case "api_response": {
        const url = new URL(opts.apiPath ?? "/api/health", base).href;
        assertAuthorized(url, opts.authorizedHosts, opts.selfOrigin);
        const r = await fetchCapped(url);
        logs.push(`GET ${url} → ${r.status}: ${r.body.slice(0, 200)}`);
        let json = true;
        try {
          JSON.parse(r.body);
        } catch {
          json = false;
        }
        return done(
          r.status >= 200 && r.status < 300 && json,
          `API ${url} returned ${r.status}${json ? " JSON" : " non-JSON"}: ${r.body.slice(0, 160)}`,
        );
      }
      case "mobile_overflow": {
        const issues: string[] = [];
        if (!/<meta[^>]+name=["']viewport["']/i.test(page.body))
          issues.push("missing viewport meta tag");
        const wide = [...page.body.matchAll(/(?:min-)?width\s*:\s*(\d{3,5})px/gi)]
          .map((m) => Number(m[1]))
          .filter((w) => w > 420);
        if (wide.length)
          issues.push(`fixed widths wider than a 390px phone: ${[...new Set(wide)].join(", ")}px`);
        return done(
          issues.length === 0,
          issues.length
            ? `Likely horizontal overflow on mobile: ${issues.join("; ")}`
            : "No fixed-width overflow patterns found (static analysis)",
        );
      }
      case "accessibility": {
        const issues: string[] = [];
        if (!/<html[^>]+lang=/i.test(page.body)) issues.push("<html> has no lang");
        if (!/<title>[^<]+<\/title>/i.test(page.body)) issues.push("missing <title>");
        const noAlt = (page.body.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) ?? []).length;
        if (noAlt) issues.push(`${noAlt} image(s) without alt`);
        const emptyBtn = (page.body.match(/<button\b[^>]*>\s*<\/button>/gi) ?? []).length;
        if (emptyBtn) issues.push(`${emptyBtn} empty button(s)`);
        return done(
          issues.length === 0,
          issues.length
            ? issues.join("; ")
            : "Basic accessibility checks passed (lang, title, alt text, button names)",
        );
      }
    }
  } catch (e) {
    logs.push(`ERROR ${(e as Error).message}`);
    return done(false, (e as Error).message);
  }
}
