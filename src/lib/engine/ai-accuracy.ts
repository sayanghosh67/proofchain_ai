export type AIExecution = {
  id: string;
  action: string;
  runId: string | null;
  model: string;
  status: "completed" | "failed";
  accuracy: null;
  accuracyStatus: "not_measured";
  reason: string;
  durationMs: number;
  executedAt: string;
};

/** Output validation, confidence and test pass rate are not ground-truth accuracy. */
export function executionAccuracy(
  input: Omit<AIExecution, "accuracy" | "accuracyStatus" | "reason">,
): AIExecution {
  return {
    ...input,
    accuracy: null,
    accuracyStatus: "not_measured",
    reason:
      input.status === "failed"
        ? "Execution failed; no accuracy assessment is available."
        : "No independently labelled reference answers were compared with this output. Model confidence and test pass rate are not AI accuracy.",
  };
}

export function parseAIExecution(text: string): AIExecution | null {
  try {
    const value = JSON.parse(text);
    if (
      typeof value.id !== "string" ||
      typeof value.action !== "string" ||
      typeof value.model !== "string" ||
      (value.status !== "completed" && value.status !== "failed") ||
      value.accuracy !== null ||
      value.accuracyStatus !== "not_measured" ||
      typeof value.reason !== "string" ||
      typeof value.durationMs !== "number" ||
      typeof value.executedAt !== "string" ||
      (value.runId !== null && typeof value.runId !== "string")
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
