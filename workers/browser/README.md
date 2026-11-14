# ProofChain separate browser worker

Runs real Chromium/Playwright in a separate container, not in the app's edge runtime. Demo audits and approved navigation retests require this worker; they never silently fall back to HTTP checks. Other project targets remain HTTP-only.

## Deploy

Deploy this directory as a Docker web service on a container host (for example Render, Fly.io or a VM) with at least 1 GB RAM. Set its health-check path to `/health` and forward port 9000 (or set `PORT`). The service needs a public HTTPS URL. No deployment account is connected to this project, so deployment is not performed automatically.

Set these environment variables on the worker through your hosting service's secret controls:

- `BROWSER_WORKER_SECRET`: a securely generated random shared secret, also configured in the app. Do not commit it or put it into browser code.
- `BROWSER_ALLOWED_ORIGINS`: comma-separated exact public app origins, without trailing slashes. Include the origin stored in the demo project's website URL. Use the published app's public origin in production; the external worker cannot reach sandbox localhost or a private preview requiring a viewer cookie.
- `BROWSER_SANDBOX=true` (default). Run as the container's non-root `pwuser`. Your host must allow Chromium sandbox user namespaces; on Docker use an appropriate seccomp profile permitting user namespace creation, as described in Playwright's Docker documentation. Do not disable sandbox for production targets.

In Lovable's app secret controls, set:

- `BROWSER_WORKER_URL`: the worker's public HTTPS origin.
- `BROWSER_WORKER_SECRET`: the same shared secret.

Publish the app so the worker can reach `/api/public/demo/site`. Create a new demo on that public origin (older demo URLs retain the origin on which they were created), then run the audit. Open **Tests → View browser capture** for actual rendered page text and screenshot. The private evidence vault persists captures across refreshes. Approving the demo Reports fix launches the same browser worker against the isolated `?ws=` copy.

## Isolation and security

- Only exact operator-configured origins and `/api/public/demo/` fixture paths are allowed. Caller input cannot extend the worker's allow-list.
- Each job launches a fresh sandboxed Chromium process/context. No original repositories, arbitrary scripts, user account cookies or app bearer tokens are supplied to it.
- Every navigation, redirect and subresource is intercepted. Destination DNS is checked for private/reserved addresses and pinned for the mediated connection. Cross-origin requests, arbitrary POSTs, service workers, WebSockets and downloads are blocked. Only the public fixture login accepts POST.
- Authenticated `/run`, one active job, maximum 40 network requests, 45-second job timeout, bounded response sizes. `/health` is public and contains no secrets. Put this service behind host ingress rate limits; do not enable HTTP request-header logging.
- Production egress firewall rules should deny private/reserved networks as defense in depth. No credentials are forwarded to the target, so private hosted previews are intentionally unsupported.
- Screenshots use JPEG viewport captures; logs contain page titles/text but no login secrets. Accessibility checks inspect rendered DOM basics, not full axe/WCAG certification.
- Worker/infrastructure errors return 503 and never create failed claim verdicts. Only completed browser checks can pass/fail.

## Local verification

```sh
pip install -r requirements.txt
python -m unittest discover -s . -p 'test_worker.py'
```

For local-only testing, configure the allow-list to `http://localhost:8080` and set `BROWSER_ALLOW_LOCAL_TESTS=true`. This exception is rejected if any allowed origin is non-loopback. The app's deployed transport still requires HTTPS; local verification can call the worker directly. Never enable the loopback exception in production.

## Test behavior

- Availability/status: actual page navigation and visible content.
- Broken links: rendered anchors navigated in Chromium; failure capture shows the destination page.
- Login: invalid and valid public fixture credentials typed and submitted through real browser forms.
- Form behavior: browser-native validity check using an invalid email.
- API: opened in Chromium and checked for HTTP status and JSON body.
- Mobile: reload at 390×844, measure actual document/body scroll width against viewport.
- Accessibility: rendered language/title/image alt/input labels/button names, explicitly limited scope.

No external deployment, production connection, or published-app end-to-end pass is claimed until host URL and shared secret are configured and a real public audit succeeds.