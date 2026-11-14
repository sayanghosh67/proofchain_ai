import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProjectConsent } from "@/lib/audit.functions";
import { auditIntelligence } from "@/lib/engine/intelligence";
import { ConsentFields, type Consent } from "./ConsentFields";
import type { ProjectData } from "./data";

export function Intelligence({ d }: { d: ProjectData }) {
  const current = d.tests.filter((t) => t.audit_run_id === d.latestRun?.id);
  const previous = d.tests.filter(
    (t) =>
      t.audit_run_id &&
      t.audit_run_id !== d.latestRun?.id &&
      t.created_at < (d.latestRun?.created_at ?? ""),
  );
  const r = auditIntelligence(d.claims, current, previous);
  return (
    <section className="space-y-5 border-t border-border py-5" aria-label="Progress intelligence">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Progress intelligence
        </h2>
        <span className="font-mono text-xs text-muted-foreground">EVIDENCE / V1</span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Trust score", r.trustScore === null ? "Not measured" : `${r.trustScore}/100`],
          ["Verification coverage", `${Math.round(r.coverage * 100)}%`],
          ["Contradicted claims", r.contradicted],
          ["Anomalies", r.anomalies.length],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 border-l-2 border-primary pl-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-2 break-words text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Trust score: 70% claim support + 30% latest test pass rate. Partial support earns half
        credit. This is not AI accuracy or a security certification.
      </p>
      <details>
        <summary className="flex cursor-pointer items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-warning" />
          Fake-progress signals & anomalies ({r.anomalies.length})
        </summary>
        {r.anomalies.length ? (
          <ul className="mt-3 divide-y divide-border">
            {r.anomalies.map((a, i) => (
              <li key={`${a.kind}-${i}`} className="py-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-1 text-xs text-warning">{a.kind.replace(/_/g, " ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">
            {d.latestRun
              ? "No evidence-based anomaly signals in the current audit."
              : "Awaiting an audit."}
          </p>
        )}
      </details>
    </section>
  );
}

export function ProjectConsent({ d, expanded = false }: { d: ProjectData; expanded?: boolean }) {
  const p = d.project;
  const [consent, setConsent] = useState<Consent>({
    organization_type:
      p.organization_type === "private" || p.organization_type === "public"
        ? p.organization_type
        : "individual",
    organization_name: p.organization_name,
    ai_consent: p.ai_consent,
    code_consent: p.code_consent,
    test_consent: p.test_consent,
    fix_consent: p.fix_consent,
  });
  const [busy, setBusy] = useState(false);
  const save = useServerFn(updateProjectConsent);
  const qc = useQueryClient();
  if (p.is_demo) return null;
  return (
    <details open={expanded || undefined} className="border-t border-border py-5">
      <summary className="cursor-pointer font-semibold">
        Organization & permissions · {p.organization_type}
      </summary>
      <form
        className="mt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save({ data: { projectId: p.id, consent } });
            await qc.invalidateQueries({ queryKey: ["project", p.id] });
            toast.success("Permissions saved");
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <ConsentFields value={consent} onChange={setConsent} />
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? "Saving…" : "Save permissions"}
        </Button>
      </form>
    </details>
  );
}
