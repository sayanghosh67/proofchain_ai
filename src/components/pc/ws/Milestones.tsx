/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveMilestone, deleteMilestone, reviewMilestone } from "@/lib/product.functions";
import { milestoneProgress, type Milestone, type EvidenceReview } from "@/lib/engine/milestones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ProjectData } from "./data";
export const milestoneQuery = (projectId: string) => ({
  queryKey: ["milestones", projectId],
  queryFn: async () => {
    const db = supabase as any;
    const [m, r] = await Promise.all([
      db.from("milestones").select("*").eq("project_id", projectId).order("created_at"),
      db
        .from("evidence_reviews")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);
    if (m.error || r.error) throw new Error((m.error || r.error).message);
    return { milestones: m.data as Milestone[], reviews: r.data as EvidenceReview[] };
  },
});
const blank = {
  title: "",
  acceptance_criteria: "",
  weight: 1,
  claimed_progress: 0,
  evidence_ids: [] as string[],
};
export function Milestones({ d }: { d: ProjectData }) {
  const { data, error, isLoading } = useQuery(milestoneQuery(d.project.id));
  const qc = useQueryClient();
  const save = useServerFn(saveMilestone),
    remove = useServerFn(deleteMilestone),
    review = useServerFn(reviewMilestone);
  const [values, setValues] = useState(blank),
    [editing, setEditing] = useState<string>(),
    [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["milestones", d.project.id] });
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const progress = milestoneProgress(data?.milestones ?? [], data?.reviews ?? []);
  return (
    <section className="space-y-5 border-t border-border py-6">
      <div>
        <h2 className="text-xl font-semibold">Milestones & evidence-supported progress</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Weighted by your milestones. Gemini assessments are clearly separated from executed test
          verdicts.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          Milestones unavailable: {error.message}
        </p>
      )}
      {isLoading ? (
        <p>Loading milestones…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Claimed progress", `${progress.claimed.toFixed(1)}%`],
            [
              "AI evidence-supported",
              progress.assessed ? `${progress.supported.toFixed(1)}%` : "Not Yet Assessed",
            ],
            ["Verification gap", progress.assessed ? `${progress.gap.toFixed(1)}%` : "—"],
            ["Assessed milestones", `${progress.assessed}/${progress.total}`],
          ].map(([label, value]) => (
            <div className="glass p-4" key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}
      <form
        className="glass space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await save({ data: { projectId: d.project.id, milestoneId: editing, values } });
            setValues(blank);
            setEditing(undefined);
            toast.success("Milestone saved");
          });
        }}
      >
        <h3 className="font-medium">{editing ? "Edit milestone" : "Add milestone"}</h3>
        <label className="block space-y-1 text-sm">
          Title
          <Input
            required
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Acceptance criteria
          <Textarea
            required
            placeholder="Describe the observable outcomes required for completion"
            value={values.acceptance_criteria}
            onChange={(e) => setValues({ ...values, acceptance_criteria: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            Weight
            <Input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              required
              value={values.weight}
              onChange={(e) => setValues({ ...values, weight: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1 text-sm">
            Claimed progress (%)
            <Input
              type="number"
              min="0"
              max="100"
              required
              value={values.claimed_progress}
              onChange={(e) => setValues({ ...values, claimed_progress: Number(e.target.value) })}
            />
          </label>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm">Link supporting evidence</legend>
          <div className="max-h-40 space-y-2 overflow-auto">
            {d.evidence.length ? (
              d.evidence.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.evidence_ids.includes(e.id)}
                    onChange={(ev) =>
                      setValues({
                        ...values,
                        evidence_ids: ev.target.checked
                          ? [...values.evidence_ids, e.id]
                          : values.evidence_ids.filter((id) => id !== e.id),
                      })
                    }
                  />
                  {e.title}
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Upload evidence in the Evidence Vault, then link it here.
              </p>
            )}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <Button disabled={busy || !!error} type="submit">
            {busy ? "Working…" : "Save milestone"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(undefined);
                setValues(blank);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
      {data?.milestones.map((m) => {
        const latest = data.reviews.find((r) => r.milestone_id === m.id);
        const stale = latest && latest.input_snapshot.milestone.updated_at !== m.updated_at;
        return (
          <article className="glass space-y-3 p-5" key={m.id}>
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-semibold">{m.title}</h3>
              <span className="text-sm text-muted-foreground">
                Weight {m.weight} · Claimed {m.claimed_progress}%
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{m.acceptance_criteria}</p>
            <p className="text-xs text-muted-foreground">
              {m.evidence_ids.length} linked evidence items
            </p>
            {latest && (
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-primary">
                  {stale
                    ? "Assessment outdated — rerun required"
                    : latest.result.claim_status.replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-sm">{latest.result.explanation}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Assessment confidence {latest.result.confidence_score}% · {latest.model} ·{" "}
                  {new Date(latest.created_at).toLocaleString()}
                </p>
                {[
                  ...latest.result.missing_evidence,
                  ...latest.result.contradictions,
                  ...latest.result.recommendations,
                ].map((t, i) => (
                  <p className="mt-2 text-sm" key={i}>
                    • {t}
                  </p>
                ))}
                <details className="mt-3 text-xs">
                  <summary>Evidence references</summary>
                  {latest.result.evidence_ids.map((id) => (
                    <p className="break-all" key={id}>
                      {d.evidence.find((e) => e.id === id)?.title ?? "Historical evidence"} · {id}
                    </p>
                  ))}
                </details>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || !d.project.ai_consent}
                onClick={() =>
                  void run(async () => {
                    await review({ data: { projectId: d.project.id, milestoneId: m.id } });
                    toast.success("Evidence assessment saved");
                  })
                }
              >
                Assess with Gemini
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => {
                  setEditing(m.id);
                  setValues({
                    title: m.title,
                    acceptance_criteria: m.acceptance_criteria,
                    weight: m.weight,
                    claimed_progress: m.claimed_progress,
                    evidence_ids: m.evidence_ids,
                  });
                }}
              >
                Edit
              </Button>
              <Button
                disabled={busy}
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete milestone “${m.title}” and its review history?`))
                    void run(() =>
                      remove({ data: { projectId: d.project.id, milestoneId: m.id } }),
                    );
                }}
              >
                Delete
              </Button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
