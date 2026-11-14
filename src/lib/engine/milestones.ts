import { z } from "zod";
export const MilestoneSchema = z.object({
  title: z.string().trim().min(1).max(200),
  acceptance_criteria: z.string().trim().min(1).max(12000),
  weight: z.number().positive().max(100),
  claimed_progress: z.number().min(0).max(100),
  evidence_ids: z.array(z.string().uuid()).max(30),
});
export const ReviewSchema = z.object({
  claim_status: z.enum(["verified", "unsupported", "contradicted", "insufficient_evidence"]),
  confidence_score: z.number().min(0).max(100),
  supported_criteria: z.array(z.string()).max(30),
  missing_evidence: z.array(z.string()).max(30),
  contradictions: z.array(z.string()).max(30),
  findings: z.array(z.string()).max(30),
  recommendations: z.array(z.string()).max(30),
  explanation: z.string().max(12000),
  evidence_ids: z.array(z.string().uuid()).max(30),
  supported_progress: z.number().min(0).max(100),
});
export type Milestone = z.infer<typeof MilestoneSchema> & { id: string; updated_at: string };
export type EvidenceReview = {
  id: string;
  milestone_id: string;
  model: string;
  created_at: string;
  result: z.infer<typeof ReviewSchema>;
  input_snapshot: { milestone: Milestone; evidence: Array<{ id: string }> };
};
export function milestoneProgress(milestones: Milestone[], reviews: EvidenceReview[]) {
  let claimed = 0,
    supported = 0,
    assessed = 0;
  const weight = milestones.reduce((n, m) => n + m.weight, 0);
  for (const m of milestones) {
    claimed += m.weight * m.claimed_progress;
    const r = reviews
      .filter(
        (r) => r.milestone_id === m.id && r.input_snapshot.milestone.updated_at === m.updated_at,
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (r) {
      assessed++;
      supported +=
        m.weight *
        (r.result.claim_status === "verified"
          ? Math.min(m.claimed_progress, r.result.supported_progress)
          : 0);
    }
  }
  return {
    claimed: weight ? claimed / weight : 0,
    supported: weight ? supported / weight : 0,
    gap: weight ? (claimed - supported) / weight : 0,
    assessed,
    total: milestones.length,
  };
}
