// DEMONSTRATION DATA — an isolated fixture project with deliberate defects.
export const DEMO_LOGIN = { user: "demo@proofchain.ai", pass: "demo1234" };

export const DEMO_NAV_FILE = "src/components/Nav.tsx";
export const DEMO_NAV_SOURCE = `export function Nav() {
  return (
    <nav className="nav">
      <a href="/api/public/demo/site">Dashboard</a>
      <a href="/api/public/demo/site/login">Login</a>
      <a href="/api/public/demo/site/reprots">Reports</a>
    </nav>
  );
}
`;

export const DEMO_REPORT = `Sprint 7 Progress Report — Acme Analytics (DEMO)
Status: 100% complete, ready for launch.
- The dashboard is live and loads instantly.
- The login system works for all users.
- Navigation between Dashboard, Login and Reports is fully working.
- The stats API is stable and returns live metrics.
- The site is fully responsive and works perfectly on mobile.
- Accessibility has been fully audited and is WCAG compliant.`;

export const DEMO_REQUIREMENTS = `R1: Users can sign in with email and password.
R2: Users can navigate to the Reports page from the main navigation.
R3: The stats API returns JSON metrics.
R4: The site renders without horizontal scrolling on phones.
R5: Pages meet basic accessibility (lang, alt text, labels).`;

/** Extract hrefs from source as plain data — the patched code is never executed. */
export function hrefsFromSource(src: string): { href: string; label: string }[] {
  return [...src.matchAll(/<a\s+href="([^"]+)"\s*>([^<]{1,40})<\/a>/g)]
    .map((m) => ({ href: m[1] ?? "", label: m[2] ?? "" }))
    .filter((l) => /^\/api\/public\/demo\/site(\/[a-z-]*)?$/.test(l.href))
    .slice(0, 8);
}
