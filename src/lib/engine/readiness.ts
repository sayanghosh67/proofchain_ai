export type ClaimStatus =
  "verified" | "partially_verified" | "unsupported" | "contradicted" | "not_tested";
export type Verdict = "GO" | "CONDITIONAL GO" | "NO-GO" | "UNKNOWN";

export function computeReadiness(input: {
  tests: { passed: boolean }[];
  claims: { status: ClaimStatus | string }[];
  openFindings: { severity: string }[];
}) {
  const total = input.tests.length;
  const passRate = total ? input.tests.filter((t) => t.passed).length / total : 0;
  const claimsN = input.claims.length;
  const verified = input.claims.filter(
    (c) => c.status === "verified" || c.status === "partially_verified",
  ).length;
  const coverage = claimsN
    ? input.claims.filter((c) => c.status !== "not_tested").length / claimsN
    : 0;
  const critical = input.openFindings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  ).length;
  const contradicted = input.claims.filter((c) => c.status === "contradicted").length;
  const reasons: string[] = [];
  let verdict: Verdict;
  if (total === 0 || claimsN === 0) {
    verdict = "UNKNOWN";
    reasons.push("Not enough tests or claims to judge.");
  } else if (critical > 0 || passRate < 0.6) {
    verdict = "NO-GO";
    reasons.push(
      `${critical} high/critical open finding(s); pass rate ${Math.round(passRate * 100)}%.`,
    );
  } else if (contradicted > 0 || passRate < 0.9 || coverage < 0.8) {
    verdict = "CONDITIONAL GO";
    reasons.push(
      `${contradicted} contradicted claim(s); pass rate ${Math.round(passRate * 100)}%; coverage ${Math.round(coverage * 100)}%.`,
    );
  } else {
    verdict = "GO";
    reasons.push("All high-severity issues resolved and claims verified within tested scope.");
  }
  return { verdict, passRate, coverage, verifiedClaims: verified, criticalOpen: critical, reasons };
}

export const SEVERITY: Record<string, string> = {
  availability: "critical",
  http_status: "high",
  login_flow: "critical",
  broken_links: "high",
  api_response: "high",
  form_behavior: "medium",
  mobile_overflow: "medium",
  accessibility: "low",
};
