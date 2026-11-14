import type { AIExecution } from "@/lib/engine/ai-accuracy";

export function AIAccuracy({ executions }: { executions: AIExecution[] }) {
  return (
    <section className="min-w-0 border-t border-border py-5" aria-label="AI execution accuracy">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">AI execution accuracy</h2>
        <span className="text-xs text-muted-foreground">{executions.length} executions</span>
      </div>
      {!executions.length ? (
        <p className="py-3 text-sm text-muted-foreground">
          No recorded AI executions. Earlier executions have no accuracy record.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {executions.map((e) => (
            <li key={e.id} className="min-w-0 py-4">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">{e.action}</p>
                <p className="text-sm text-warning">Accuracy: Not measured</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.model} · {e.status} · {(e.durationMs / 1000).toFixed(1)}s ·{" "}
                {new Date(e.executedAt).toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{e.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
