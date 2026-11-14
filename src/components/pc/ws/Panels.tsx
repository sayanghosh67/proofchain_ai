import { deleteEvidence } from "@/lib/product.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleDashed,
  Github,
  Loader2,
  Play,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import {
  analyzeScreenshot,
  approveFix,
  finalizeAudit,
  generateFix,
  importGithub,
  investigateFinding,
  rejectFix,
  runAgent,
  runSingleTest,
  startAudit,
} from "@/lib/audit.functions";
import { TEST_TYPES, type TestType } from "@/lib/engine/http-tests";
import { uploadEvidence } from "@/lib/evidence";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Status } from "@/components/pc/Status";
import type { ProjectData } from "./data";
import { BrowserEvidence } from "./BrowserEvidence";

const useRefresh = (id: string) => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["project", id] });
};
const Card = ({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <section className="min-w-0 border-t border-border py-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);
const Empty = ({ t }: { t: string }) => (
  <p className="py-6 text-center text-sm text-muted-foreground">{t}</p>
);

export function Overview({ d }: { d: ProjectData }) {
  const refresh = useRefresh(d.project.id);
  const gh = useServerFn(importGithub);
  const [busy, setBusy] = useState(false);
  const meta = d.project.github_meta as null | {
    full_name: string;
    description: string;
    language: string;
    stars: number;
    pushed_at: string;
    files: string[];
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Project details">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Description</dt>
            <dd>{d.project.description || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Website (authorized target)</dt>
            <dd className="break-all font-mono text-xs">{d.project.website_url || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">GitHub</dt>
            <dd className="break-all font-mono text-xs">{d.project.github_url || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Latest verdict</dt>
            <dd>
              {d.latestRun?.verdict ? <Status value={d.latestRun.verdict} /> : "No completed audit"}
            </dd>
          </div>
        </dl>
      </Card>
      <Card title="Requirements">
        <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
          {d.project.requirements || "None provided."}
        </pre>
      </Card>
      <Card
        title="Repository"
        action={
          d.project.github_url && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const { data: session } = await supabase.auth.getSession();
                  const r = await gh({
                    data: {
                      projectId: d.project.id,
                      token:
                        session.session?.user.app_metadata["provider"] === "github"
                          ? (session.session.provider_token ?? undefined)
                          : undefined,
                    },
                  });
                  if ("error" in r && r.error) toast.error(r.error);
                  else {
                    toast.success("Repository snapshot saved");
                    refresh();
                  }
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Github className="mr-1 h-4 w-4" />
              {busy ? "Importing…" : "Import GitHub"}
            </Button>
          )
        }
      >
        <Button
          size="sm"
          variant="outline"
          className="mb-4"
          onClick={async () => {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "github",
              options: { scopes: "repo", redirectTo: window.location.origin + "/auth" },
            });
            if (error) toast.error(error.message);
          }}
        >
          Authorize GitHub access
        </Button>
        <p className="mb-3 text-xs text-muted-foreground">
          Import retrieves actual commits, pull requests, and Actions results. Private repositories
          require GitHub authorization; a commit alone does not prove completion.
        </p>
        {meta ? (
          <div className="text-sm">
            <p className="font-medium">
              {meta.full_name} · {meta.language} · ★{meta.stars}
            </p>
            <p className="text-muted-foreground">{meta.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Last push {new Date(meta.pushed_at).toLocaleDateString()}
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-xs">
              {meta.files.slice(0, 20).map((f) => (
                <li key={f} className="truncate">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Empty
            t={d.project.github_url ? "Not imported yet." : "No GitHub URL on this project."}
          />
        )}
      </Card>
      <Card title="Findings summary">
        {d.findings.length ? (
          <ul className="space-y-2 text-sm">
            {d.findings.map((f) => (
              <li key={f.id} className="flex justify-between gap-2">
                <span>{f.title}</span>
                <Status value={f.status === "resolved" ? "resolved" : f.severity} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty t="No findings yet." />
        )}
      </Card>
    </div>
  );
}

const STAGES = [
  ["extracting_claims", "Claim extraction agent"],
  ["agent_running", "Verification agent runs approved tools & tests"],
  ["finalizing", "Progress integrity & anomaly agents review evidence"],
  ["done", "Complete"],
] as const;

export function AuditPanel({ d, autostart }: { d: ProjectData; autostart?: boolean | undefined }) {
  const refresh = useRefresh(d.project.id);
  const s1 = useServerFn(startAudit),
    s2 = useServerFn(runAgent),
    s3 = useServerFn(finalizeAudit);
  const [stage, setStage] = useState<string | null>(null);
  const [started] = useState(() => ({ v: false }));
  const go = async () => {
    try {
      setStage("extracting_claims");
      const a = await s1({ data: { projectId: d.project.id } });
      await refresh();
      if (a.error) {
        toast.error(a.error);
        setStage(null);
        return;
      }
      toast.success(`Gemini extracted ${a.claims} claims`);
      setStage("agent_running");
      const b = await s2({ data: { runId: a.runId } });
      await refresh();
      if (b.agentError)
        toast.warning(
          `Audit warning: ${b.agentError}. Inspect the execution timeline for checks that could not run.`,
        );
      setStage("finalizing");
      const c = await s3({ data: { runId: a.runId } });
      await refresh();
      setStage("done");
      toast.success(`Audit complete: ${c.verdict}`);
    } catch (e) {
      toast.error((e as Error).message);
      setStage(null);
      refresh();
    }
  };
  if (autostart && !started.v && !stage) {
    started.v = true;
    setTimeout(go, 0);
  }
  const running = stage && stage !== "done";
  const idx = STAGES.findIndex((s) => s[0] === stage);
  return (
    <div className="space-y-6">
      <Card
        title="AI Audit"
        action={
          <Button variant="hero" onClick={go} disabled={!!running}>
            {running ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            {running ? "Audit running…" : "Start AI Audit"}
          </Button>
        }
      >
        {d.project.is_demo && (
          <p className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            Demonstration data: the target is an isolated fixture site with deliberate defects. All
            tests below are executed live against it.
          </p>
        )}
        {stage ? (
          <ol className="space-y-3">
            {STAGES.map(([k, label], i) => (
              <li key={k} className="flex items-center gap-3 text-sm">
                {i < idx || stage === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : i === idx ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <CircleDashed className="h-4 w-4 text-muted-foreground" />
                )}
                {label}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            {d.latestRun
              ? `Last audit ${d.latestRun.status} on ${new Date(d.latestRun.created_at).toLocaleString()}.`
              : "No audits yet."}
          </p>
        )}
        {d.latestRun?.summary && (
          <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4 text-sm">
            <p className="mb-1 text-xs font-medium text-primary">Gemini audit summary</p>
            {d.latestRun.summary}
          </div>
        )}
        {d.latestRun?.error && <p className="mt-4 text-sm text-destructive">{d.latestRun.error}</p>}
      </Card>
      <Card title={`Agent execution timeline (${d.tools.length} tool calls)`}>
        {d.tools.length ? (
          <ol className="relative space-y-3 border-l border-border pl-5">
            {d.tools.map((t) => (
              <li key={t.id} className="text-sm">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-gradient-brand" />
                <p>
                  <span className="font-mono text-xs text-muted-foreground">#{t.step}</span>{" "}
                  <span className="font-mono text-accent">{t.tool}</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {JSON.stringify(t.args)}
                  </span>{" "}
                  {t.status !== "ok" && (
                    <span className="text-xs text-destructive">({t.status})</span>
                  )}{" "}
                  <span className="text-xs text-muted-foreground">{t.duration_ms}ms</span>
                </p>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Result</summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                    {JSON.stringify(t.result, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ol>
        ) : (
          <Empty t="Tool calls appear here once the agent runs." />
        )}
      </Card>
      <Card title="Audit history">
        {d.runs.length ? (
          <ul className="divide-y divide-border text-sm">
            {d.runs.map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span>
                  {new Date(r.created_at).toLocaleString()} · {r.status}
                </span>
                {r.verdict && <Status value={r.verdict} />}
              </li>
            ))}
          </ul>
        ) : (
          <Empty t="No history." />
        )}
      </Card>
    </div>
  );
}

export function ClaimsPanel({ d }: { d: ProjectData }) {
  const evTitle = (id: string) => d.evidence.find((e) => e.id === id)?.title ?? id;
  return (
    <Card title={`Claims & requirements (${d.claims.length})`}>
      {d.claims.length ? (
        <div className="space-y-3">
          {d.claims.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium">"{c.text}"</p>
                <Status value={c.status} />
              </div>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
                <span>Requirement: {c.requirement || "—"}</span>
                <span>Method: {c.verification_method}</span>
                <span>Test: {c.test_type ?? "none"}</span>
              </div>
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Reason: </span>
                {c.reason || "Pending verification."}
              </p>
              {c.evidence_ids.length > 0 && (
                <p className="mt-1 text-xs text-accent">
                  Evidence: {c.evidence_ids.map(evTitle).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty t="Run an audit to extract claims." />
      )}
    </Card>
  );
}

export function EvidencePanel({ d }: { d: ProjectData }) {
  const refresh = useRefresh(d.project.id);
  const analyze = useServerFn(analyzeScreenshot);
  const removeEvidence = useServerFn(deleteEvidence);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const items = d.evidence.filter(
    (e) => !q || (e.title + e.extracted_text).toLowerCase().includes(q.toLowerCase()),
  );
  const view = async (path: string) => {
    const { data } = await supabase.storage.from("evidence").createSignedUrl(path, 120);
    if (data) window.open(data.signedUrl, "_blank", "noopener");
  };
  return (
    <Card
      title={`Evidence vault (${d.evidence.length})`}
      action={
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-secondary">
          <Upload className="h-4 w-4" />
          Upload evidence
          <input
            type="file"
            className="sr-only"
            multiple
            accept=".txt,.md,.log,.json,.csv,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.c,.cpp,.css,.html,.png,.jpg,.jpeg,.webp,.pdf"
            onChange={async (e) => {
              for (const f of e.target.files ?? []) {
                try {
                  await uploadEvidence(d.project.id, f);
                  toast.success(`Stored ${f.name}`);
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }
              refresh();
            }}
          />
        </label>
      }
    >
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search evidence text…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((e) => (
            <li key={e.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  className="text-left font-medium hover:text-primary"
                  onClick={() => setOpen(open === e.id ? null : e.id)}
                >
                  {e.title}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {e.kind} · {e.source}
                  </span>
                </button>
                <div className="flex gap-2">
                  {e.storage_path && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (e.storage_path) void view(e.storage_path);
                      }}
                    >
                      View file
                    </Button>
                  )}
                  {(e.mime_type?.startsWith("image/") || e.mime_type === "application/pdf") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === e.id}
                      onClick={async () => {
                        setBusy(e.id);
                        try {
                          const r = await analyze({ data: { evidenceId: e.id } });
                          if ("error" in r && r.error) toast.error(r.error);
                          else {
                            toast.success("Gemini analyzed evidence");
                            refresh();
                          }
                        } catch (err) {
                          toast.error((err as Error).message);
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      {busy === e.id ? "Analyzing…" : "Analyze with Gemini"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!busy}
                    onClick={async () => {
                      if (!window.confirm(`Delete evidence “${e.title}”?`)) return;
                      setBusy(e.id);
                      try {
                        await removeEvidence({
                          data: { projectId: d.project.id, evidenceId: e.id },
                        });
                        await refresh();
                        toast.success("Evidence deleted");
                      } catch (err) {
                        toast.error((err as Error).message);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {open === e.id && (
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-secondary/50 p-3 font-mono text-xs">
                  {e.extracted_text || "(no extracted text)"}
                </pre>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty t="No evidence matches." />
      )}
    </Card>
  );
}

export function TestsPanel({ d }: { d: ProjectData }) {
  const refresh = useRefresh(d.project.id);
  const run = useServerFn(runSingleTest);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <Card title="Run an approved test">
        <p className="mb-3 text-xs text-muted-foreground">
          {d.project.is_demo
            ? "Execution: separate Chromium browser · screenshots and rendered page text"
            : "Execution: controlled HTTP checks · no browser"}
        </p>
        {!d.project.website_url ? (
          <Empty t="Add a website URL to enable tests." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {TEST_TYPES.map((t) => (
              <Button
                key={t}
                size="sm"
                variant="outline"
                disabled={!!busy}
                onClick={async () => {
                  setBusy(t);
                  try {
                    const r = await run({
                      data: { projectId: d.project.id, testType: t as TestType },
                    });
                    (r.passed ? toast.success : toast.error)(`${t}: ${r.details}`);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                  setBusy(null);
                  refresh();
                }}
              >
                {busy === t && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {t.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        )}
      </Card>
      <Card title={`Test log (${d.tests.length})`}>
        {d.tests.length ? (
          <ul className="space-y-2">
            {[...d.tests].reverse().map((t) => (
              <li key={t.id} className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  {(t.logs as string[]).some((l) => l.startsWith("BROWSER_EVIDENCE:"))
                    ? "Live Chromium browser evidence"
                    : "HTTP-only result · no browser capture"}
                </p>
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                    {t.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono">{t.test_type}</span>
                    {t.is_retest && <span className="text-xs text-accent">retest</span>}
                    <span className="text-muted-foreground">{t.details}</span>
                  </summary>
                  <BrowserEvidence logs={t.logs as string[]} evidence={d.evidence} />
                  <pre className="mt-2 overflow-auto rounded bg-secondary/50 p-3 font-mono text-xs">
                    {(t.logs as string[]).join("\n")}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <Empty t="No tests run yet." />
        )}
      </Card>
    </div>
  );
}

type Hyp = { cause: string; confidence: number; verify_by: string; suggested_fix: string };
export function BugsPanel({ d, onFix }: { d: ProjectData; onFix: () => void }) {
  const refresh = useRefresh(d.project.id);
  const inv = useServerFn(investigateFinding);
  const gen = useServerFn(generateFix);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <Card title={`Bug intelligence (${d.findings.length})`}>
      {d.findings.length ? (
        <div className="space-y-4">
          {d.findings.map((f) => (
            <div key={f.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{f.title}</p>
                <div className="flex gap-2">
                  <Status value={f.severity} />
                  <Status value={f.status} />
                </div>
              </div>
              {f.repro_steps && (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                  {f.repro_steps}
                </pre>
              )}
              {f.error_evidence && (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-secondary/50 p-2 font-mono text-xs">
                  {f.error_evidence}
                </pre>
              )}
              {Array.isArray(f.hypotheses) && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-violet">
                    Gemini root-cause hypotheses (unconfirmed)
                  </p>
                  <ol className="mt-1 space-y-2 text-sm">
                    {(f.hypotheses as unknown as Hyp[]).map((h, i) => (
                      <li key={i} className="rounded border border-border p-2">
                        <b>{Math.round(h.confidence * 100)}% confidence (not accuracy)</b> {h.cause}
                        <p className="text-xs text-muted-foreground">Verify: {h.verify_by}</p>
                        <p className="text-xs text-accent">Suggested: {h.suggested_fix}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {f.test_result_id && f.status === "open" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy(f.id + "i");
                      const r = await inv({ data: { findingId: f.id } });
                      setBusy(null);
                      if ("error" in r && r.error) toast.error(r.error);
                      refresh();
                    }}
                  >
                    {busy === f.id + "i" ? "Investigating…" : "Investigate root cause"}
                  </Button>
                  <Button
                    size="sm"
                    variant={f.fixable ? "hero" : "ghost"}
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy(f.id + "f");
                      const r = await gen({ data: { findingId: f.id } });
                      setBusy(null);
                      if ("error" in r && r.error) toast.error(r.error);
                      else {
                        toast.success("Fix proposed — review it in Recovery");
                        await refresh();
                        onFix();
                      }
                    }}
                  >
                    {busy === f.id + "f" ? "Generating…" : "Generate fix"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty t="No findings — run an audit." />
      )}
    </Card>
  );
}

function Diff({ a, b }: { a: string; b: string }) {
  const A = a.split("\n"),
    B = b.split("\n");
  const rows: [string, string][] = [];
  const max = Math.max(A.length, B.length);
  for (let i = 0; i < max; i++) {
    const a = A[i],
      b = B[i];
    if (a === b) rows.push([" ", a ?? ""]);
    else {
      if (a !== undefined) rows.push(["-", a]);
      if (b !== undefined) rows.push(["+", b]);
    }
  }
  return (
    <pre className="overflow-auto rounded bg-secondary/50 p-3 font-mono text-xs">
      {rows.map(([k, l], i) => (
        <div
          key={i}
          className={
            k === "-"
              ? "bg-destructive/15 text-destructive"
              : k === "+"
                ? "bg-success/15 text-success"
                : ""
          }
        >
          {k} {l}
        </div>
      ))}
    </pre>
  );
}

export function RecoveryPanel({ d }: { d: ProjectData }) {
  const refresh = useRefresh(d.project.id);
  const ok = useServerFn(approveFix);
  const no = useServerFn(rejectFix);
  const [busy, setBusy] = useState<string | null>(null);
  const before = (fid: string) =>
    d.tests.find((t) => t.id === d.findings.find((f) => f.id === fid)?.test_result_id);
  return (
    <Card title="Recovery Studio">
      {d.fixes.length ? (
        <div className="space-y-5">
          {d.fixes.map((x) => {
            const b = before(x.finding_id);
            return (
              <div key={x.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm">{x.file_path}</p>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {x.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{x.explanation}</p>
                <div className="mt-3">
                  <Diff a={x.original_code} b={x.patched_code} />
                </div>
                {x.status === "proposed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.project.is_demo ? (
                      <Button
                        variant="hero"
                        size="sm"
                        className="h-auto min-h-8 whitespace-normal text-left"
                        disabled={!!busy}
                        onClick={async () => {
                          setBusy(x.id);
                          try {
                            const r = await ok({ data: { proposalId: x.id } });
                            if ("error" in r && r.error) toast.error(r.error);
                            else
                              (r.passed ? toast.success : toast.error)(
                                `Retest ${r.passed ? "passed" : "failed"}: ${r.details}`,
                              );
                          } catch (e) {
                            toast.error((e as Error).message);
                          } finally {
                            setBusy(null);
                            refresh();
                          }
                        }}
                      >
                        {busy === x.id
                          ? "Applying & retesting…"
                          : "Approve & apply in isolated workspace"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(
                            new Blob([x.patched_code], { type: "text/plain" }),
                          );
                          a.download = x.file_path.split("/").pop() || "proposed-fix.txt";
                          a.click();
                          URL.revokeObjectURL(a.href);
                        }}
                      >
                        Download proposed source
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await no({ data: { proposalId: x.id } });
                        refresh();
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                {x.applied && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded border border-destructive/30 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">Before</p>
                      {b ? (
                        <>
                          <Status value={b.passed ? "pass" : "fail"} />{" "}
                          <span className="text-xs">{b.details}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="rounded border border-success/30 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">After retest</p>
                      {x.retest_passed == null ? (
                        "—"
                      ) : (
                        <Status value={x.retest_passed ? "pass" : "fail"} />
                      )}
                    </div>
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  {d.project.is_demo
                    ? "Applied only to an isolated demo workspace. No real repository is modified or deployed."
                    : "Unverified proposal only. Your repository is not modified; review and retest before applying."}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty t="No fix proposals. Generate one from Bug Intelligence (supported for the demo navigation bug)." />
      )}
    </Card>
  );
}

export function ReadinessPanel({ d }: { d: ProjectData }) {
  const r = d.latestRun?.readiness as null | {
    verdict: string;
    passRate: number;
    coverage: number;
    criticalOpen: number;
    verifiedClaims: number;
    reasons: string[];
  };
  if (!r)
    return (
      <Card title="Release readiness">
        <Empty t="Complete an audit to compute readiness." />
      </Card>
    );
  const missing = d.claims.filter(
    (c) => c.status === "unsupported" || c.status === "not_tested",
  ).length;
  return (
    <Card title="Release readiness">
      <div className="flex flex-col items-center py-4">
        <Status value={r.verdict} className="px-5 py-2 text-lg" />
        <p className="mt-3 max-w-lg text-center text-sm text-muted-foreground">
          {r.reasons.join(" ")}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Test pass rate", `${Math.round(r.passRate * 100)}%`],
          ["Verification coverage", `${Math.round(r.coverage * 100)}%`],
          ["Critical/high unresolved", r.criticalOpen],
          ["Claims missing evidence", missing],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
