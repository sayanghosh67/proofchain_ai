import { describe, expect, it } from "vitest";
import { executionAccuracy, parseAIExecution } from "./ai-accuracy";

const input = {
  id: "execution-1",
  action: "Claim extraction",
  runId: "run-1",
  model: "Gemini",
  status: "completed" as const,
  durationMs: 1500,
  executedAt: "2026-11-14T10:01:00Z",
};
describe("per-execution accuracy", () => {
  it("does not invent an accuracy percentage after a successful AI call", () => {
    expect(executionAccuracy(input)).toMatchObject({
      accuracy: null,
      accuracyStatus: "not_measured",
      status: "completed",
    });
  });
  it("records failed AI calls without scoring them as zero accuracy", () => {
    expect(executionAccuracy({ ...input, status: "failed" })).toMatchObject({
      accuracy: null,
      status: "failed",
    });
  });
  it("retains separate identifiers and audit associations for every execution", () => {
    const first = executionAccuracy(input);
    const second = executionAccuracy({ ...input, id: "execution-2", runId: null });
    expect(parseAIExecution(JSON.stringify(first))?.id).toBe("execution-1");
    expect(parseAIExecution(JSON.stringify(second))).toMatchObject({
      id: "execution-2",
      runId: null,
    });
  });
  it("rejects confidence masquerading as measured accuracy", () => {
    expect(
      parseAIExecution(JSON.stringify({ ...executionAccuracy(input), accuracy: 95 })),
    ).toBeNull();
  });
});
