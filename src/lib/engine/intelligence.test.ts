import { describe, expect, it } from "vitest";
import { assertConsent, auditIntelligence, ConsentSchema } from "./intelligence";

describe("organization permissions", () => {
  it("requires private organization name", () =>
    expect(
      ConsentSchema.safeParse({
        organization_type: "private",
        ai_consent: true,
        code_consent: false,
        test_consent: false,
        fix_consent: false,
      }).success,
    ).toBe(false));
  it("requires public organization name", () =>
    expect(
      ConsentSchema.safeParse({
        organization_type: "public",
        ai_consent: true,
        code_consent: false,
        test_consent: false,
        fix_consent: false,
      }).success,
    ).toBe(false));
  for (const scope of ["ai", "code", "test", "fix"] as const)
    it(`blocks ${scope} without permission`, () =>
      expect(() => assertConsent({ is_demo: false }, scope)).toThrow("Permission required"));
  it("allows code with explicit consent", () =>
    expect(() => assertConsent({ code_consent: true }, "code")).not.toThrow());
});
describe("evidence trust and anomalies", () => {
  it("never invents a score without tests", () =>
    expect(auditIntelligence([{ status: "verified" }], []).trustScore).toBeNull());
  it("scores verified and passed evidence at 100", () =>
    expect(
      auditIntelligence([{ status: "verified" }], [{ test_type: "availability", passed: true }])
        .trustScore,
    ).toBe(100));
  it("gives unsupported and failed assertions zero", () =>
    expect(
      auditIntelligence([{ status: "unsupported" }], [{ test_type: "availability", passed: false }])
        .trustScore,
    ).toBe(0));
  it("uses the latest retest in trust scoring", () =>
    expect(
      auditIntelligence(
        [{ status: "verified" }],
        [
          { test_type: "broken_links", passed: false },
          { test_type: "broken_links", passed: true },
        ],
      ).trustScore,
    ).toBe(100));
  it("gives partial support half claim credit", () =>
    expect(
      auditIntelligence(
        [{ status: "partially_verified" }],
        [{ test_type: "availability", passed: true }],
      ).trustScore,
    ).toBe(65));
  it("separates contradictions from missing evidence", () =>
    expect(
      auditIntelligence([{ status: "contradicted" }, { status: "unsupported" }], []).anomalies.map(
        (a) => a.kind,
      ),
    ).toEqual(["contradicted_claim", "unsupported_claim"]));
  it("detects pass-to-fail regressions", () =>
    expect(
      auditIntelligence(
        [],
        [{ test_type: "availability", passed: false }],
        [{ test_type: "availability", passed: true }],
      ).regressions,
    ).toBe(1));
});
