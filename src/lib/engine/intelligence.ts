import { z } from "zod";

export const ConsentSchema = z
  .object({
    organization_type: z.enum(["individual", "private", "public"]),
    organization_name: z.string().trim().max(160).default(""),
    ai_consent: z.boolean(),
    code_consent: z.boolean(),
    test_consent: z.boolean(),
    fix_consent: z.boolean(),
  })
  .refine((v) => v.organization_type === "individual" || v.organization_name.length > 0, {
    message: "Enter your organization name",
    path: ["organization_name"],
  });

export function assertConsent(
  p: {
    is_demo?: boolean;
    ai_consent?: boolean;
    code_consent?: boolean;
    test_consent?: boolean;
    fix_consent?: boolean;
  },
  scope: "ai" | "code" | "test" | "fix",
) {
  if (p.is_demo) return;
  if (!p[`${scope}_consent`])
    throw new Error(
      `Permission required for ${scope === "ai" ? "Gemini analysis" : scope === "code" ? "code analysis" : scope === "test" ? "website testing" : "fix proposals"}. Update project permissions.`,
    );
}

type Claim = { id?: string; text?: string; status: string; reason?: string | null };
type Test = {
  test_type: string;
  passed: boolean;
  created_at?: string;
  audit_run_id?: string | null;
};
export function auditIntelligence(claims: Claim[], tests: Test[], previousTests: Test[] = []) {
  const latest = new Map<string, Test>();
  for (const t of tests) latest.set(t.test_type, t);
  const checked = [...latest.values()];
  const verified = claims.filter((c) => c.status === "verified").length;
  const partial = claims.filter((c) => c.status === "partially_verified").length;
  const contradicted = claims.filter((c) => c.status === "contradicted");
  const unsupported = claims.filter((c) => c.status === "unsupported");
  const coverage = claims.length ? (verified + partial + contradicted.length) / claims.length : 0;
  const passRate = checked.length ? checked.filter((t) => t.passed).length / checked.length : 0;
  // Versioned evidence-only score: partial support gets half credit; untested assertions get none.
  const trustScore =
    claims.length && checked.length
      ? Math.round(100 * ((0.7 * (verified + partial * 0.5)) / claims.length + 0.3 * passRate))
      : null;
  const previous = new Map<string, Test>();
  for (const t of previousTests) previous.set(t.test_type, t);
  const regressions = checked.filter((t) => !t.passed && previous.get(t.test_type)?.passed);
  const anomalies = [
    ...contradicted.map((c) => ({
      kind: "contradicted_claim",
      title: c.text || "Contradicted progress claim",
      reason: c.reason || "An executed check contradicts the report.",
      claimId: c.id ?? null,
    })),
    ...unsupported.map((c) => ({
      kind: "unsupported_claim",
      title: c.text || "Unsupported progress claim",
      reason: "No independent support. Missing evidence is not proof of deception.",
      claimId: c.id ?? null,
    })),
    ...regressions.map((t) => ({
      kind: "regression",
      title: `${t.test_type.replace(/_/g, " ")} regressed`,
      reason: "Previously passed; latest executed check failed.",
      claimId: null,
    })),
  ];
  return {
    version: "evidence-v1",
    trustScore,
    coverage,
    passRate,
    verified,
    partial,
    contradicted: contradicted.length,
    unsupported: unsupported.length,
    regressions: regressions.length,
    anomalies,
  };
}
