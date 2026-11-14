import { Milestones } from "./Milestones";
import { Investigator } from "./Investigator";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/pc/Status";
import { projectQuery } from "./data";
import { useLiveAudit } from "./useLiveAudit";
import { FEATURES, type FeatureKey } from "./features";
import { FeatureNavigation } from "./FeatureNavigation";
import {
  AuditPanel,
  ClaimsPanel,
  EvidencePanel,
  TestsPanel,
  BugsPanel,
  RecoveryPanel,
  ReadinessPanel,
  Overview,
} from "./Panels";
import { Intelligence, ProjectConsent } from "./Intelligence";
import { AIAccuracy } from "./AIAccuracy";
import { GraphPanel } from "./Graph";
import { ReportPanel } from "./Report";
import { auditIntelligence } from "@/lib/engine/intelligence";

export function FeaturePage({ id, feature }: { id: string; feature: FeatureKey }) {
  const { data: d, isLoading, error, refetch, isFetching } = useQuery(projectQuery(id));
  const live = useLiveAudit(id, d?.latestRun?.id);
  const navigate = useNavigate();
  const config = FEATURES.find((f) => f.key === feature);
  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !d || !config)
    return (
      <p role="alert" className="text-destructive">
        Project unavailable.
      </p>
    );
  const r = auditIntelligence(
    d.claims,
    d.tests.filter((t) => t.audit_run_id === d.latestRun?.id),
    d.tests.filter(
      (t) =>
        t.audit_run_id &&
        t.audit_run_id !== d.latestRun?.id &&
        t.created_at < (d.latestRun?.created_at ?? ""),
    ),
  );
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard">
          <ArrowLeft className="mr-2 size-4" />
          Mission Control
        </Link>
      </Button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 break-words text-sm text-muted-foreground">
            {d.project.name}
            {d.project.is_demo ? " · Demonstration data" : ""}
          </p>
          <h1 className="break-words text-2xl font-bold md:text-3xl">{config.title}</h1>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {live ? "LIVE VERIFICATION CONNECTED" : "UPDATES EVERY 10 SECONDS"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {d.latestRun?.verdict && <Status value={d.latestRun.verdict} />}
          <Button
            size="icon"
            variant="outline"
            aria-label="Refresh project"
            title="Refresh project"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </div>
      </header>
      <FeatureNavigation id={id} active={feature} />
      {feature === "agents" && (
        <>
          <AuditPanel d={d} />
          <Investigator d={d} />
        </>
      )}
      {feature === "progress" && (
        <>
          <Milestones d={d} />
          <Intelligence d={d} />
          <ClaimsPanel d={d} />
        </>
      )}
      {feature === "verification" && (
        <>
          <Intelligence d={d} />
          <ReadinessPanel d={d} />
          <TestsPanel d={d} />
        </>
      )}
      {feature === "trust" && (
        <>
          <Intelligence d={d} />
          <ReadinessPanel d={d} />
        </>
      )}
      {feature === "accuracy" && <AIAccuracy executions={d.aiExecutions} />}
      {feature === "anomalies" && (
        <section className="space-y-4">
          <h2 className="font-semibold">Evidence-based signals · {r.anomalies.length}</h2>
          {r.anomalies.length ? (
            r.anomalies.map((a, i) => (
              <article key={i} className="rounded-lg border border-border p-4">
                <p className="text-xs text-warning">{a.kind.replace(/_/g, " ")}</p>
                <h3 className="mt-2 font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.reason}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {d.latestRun
                ? "No evidence-based anomaly signals in the current audit."
                : "Awaiting an audit."}
            </p>
          )}
        </section>
      )}
      {feature === "github" && <Overview d={d} />}
      {feature === "tests" && <TestsPanel d={d} />}
      {feature === "bugs" && (
        <BugsPanel
          d={d}
          onFix={() => void navigate({ to: "/projects/$id/recovery", params: { id } })}
        />
      )}
      {feature === "recovery" && <RecoveryPanel d={d} />}
      {feature === "evidence" && <EvidencePanel d={d} />}
      {feature === "graph" && <GraphPanel d={d} />}
      {feature === "readiness" && <ReadinessPanel d={d} />}
      {feature === "reports" && <ReportPanel d={d} />}
      {feature === "permissions" &&
        (d.project.is_demo ? (
          <p className="text-sm text-warning">
            Demonstration workspace: authorization is limited to the isolated fixture.
          </p>
        ) : (
          <ProjectConsent d={d} expanded />
        ))}
    </div>
  );
}
