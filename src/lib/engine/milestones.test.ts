import { describe, expect, it } from "vitest";
import { milestoneProgress, ReviewSchema, type Milestone, type EvidenceReview } from "./milestones";
const milestone: Milestone = {
  id: "m1",
  title: "Login",
  acceptance_criteria: "Reject invalid credentials",
  weight: 2,
  claimed_progress: 80,
  evidence_ids: [],
  updated_at: "2026-11-14T00:00:00Z",
};
const review = (
  status: EvidenceReview["result"]["claim_status"],
  updated_at = milestone.updated_at,
) =>
  ({
    id: "r1",
    milestone_id: "m1",
    model: "configured-model",
    created_at: "2026-11-14T01:00:00Z",
    result: {
      claim_status: status,
      supported_progress: 100,
      confidence_score: 90,
      supported_criteria: ["Login"],
      missing_evidence: [],
      contradictions: [],
      findings: [],
      recommendations: [],
      explanation: "Evidence supports criteria",
      evidence_ids: [],
    },
    input_snapshot: { milestone: { ...milestone, updated_at }, evidence: [] },
  }) as EvidenceReview;
describe("evidence-supported progress", () => {
  it("does not invent an assessment for no evidence", () =>
    expect(milestoneProgress([milestone], [])).toMatchObject({
      claimed: 80,
      supported: 0,
      assessed: 0,
    }));
  it("caps support at the submitted claim", () =>
    expect(milestoneProgress([milestone], [review("verified")]).supported).toBe(80));
  it("does not count contradicted or unsupported reviews", () => {
    for (const status of ["unsupported", "contradicted", "insufficient_evidence"] as const)
      expect(milestoneProgress([milestone], [review(status)]).supported).toBe(0);
  });
  it("invalidates reviews after milestone changes", () =>
    expect(milestoneProgress([milestone], [review("verified", "old")]).assessed).toBe(0));
  it("weights unassessed milestones instead of omitting them", () =>
    expect(
      milestoneProgress([milestone, { ...milestone, id: "m2", weight: 2 }], [review("verified")])
        .supported,
    ).toBe(40));
  it("rejects malformed provider data", () =>
    expect(
      ReviewSchema.safeParse({ claim_status: "verified", confidence_score: 200 }).success,
    ).toBe(false));
});
