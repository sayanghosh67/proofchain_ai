import { describe, expect, it } from "vitest";
import { computeReadiness } from "./readiness";
import { assertAuthorized } from "./http-tests";
import { hrefsFromSource, DEMO_NAV_SOURCE } from "./demo-fixture";

describe("readiness verdict", () => {
  it("is UNKNOWN with no tests", () => {
    expect(computeReadiness({ tests: [], claims: [], openFindings: [] }).verdict).toBe("UNKNOWN");
  });
  it("is NO-GO with an open high finding", () => {
    expect(
      computeReadiness({
        tests: [{ passed: true }],
        claims: [{ status: "verified" }],
        openFindings: [{ severity: "high" }],
      }).verdict,
    ).toBe("NO-GO");
  });
  it("is GO when all pass and verified", () => {
    expect(
      computeReadiness({
        tests: [{ passed: true }],
        claims: [{ status: "verified" }],
        openFindings: [],
      }).verdict,
    ).toBe("GO");
  });
});

describe("SSRF guard", () => {
  it("blocks private hosts", () => {
    expect(() => assertAuthorized("http://127.0.0.1/", ["127.0.0.1"])).toThrow();
  });
  it("blocks unauthorized hosts", () => {
    expect(() => assertAuthorized("https://evil.com/", ["example.com"])).toThrow();
  });
  it("blocks non-http schemes", () => {
    expect(() => assertAuthorized("file:///etc/passwd", [""])).toThrow();
  });
});

describe("demo patch extraction", () => {
  it("keeps only safe demo hrefs and includes the broken one", () => {
    expect(hrefsFromSource(DEMO_NAV_SOURCE).map((l) => l.href)).toContain(
      "/api/public/demo/site/reprots",
    );
    expect(hrefsFromSource('<a href="https://evil.com">x</a>')).toHaveLength(0);
  });
});
