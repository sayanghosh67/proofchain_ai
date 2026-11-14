import { BrowserVerification } from "@/components/pc/ws/BrowserVerification";
import { readBrowserProjects } from "@/lib/browser-projects";
import { ProjectManager } from "@/components/pc/ws/ProjectManager";
import { Milestones } from "@/components/pc/ws/Milestones";
import { Investigator } from "@/components/pc/ws/Investigator";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { projectQuery } from "@/components/pc/ws/data";
import { Overview, AuditPanel } from "@/components/pc/ws/Panels";
import { Status } from "@/components/pc/Status";
import { Intelligence } from "@/components/pc/ws/Intelligence";
import { useLiveAudit } from "@/components/pc/ws/useLiveAudit";
import { FeatureGrid, FeatureNavigation } from "@/components/pc/ws/FeatureNavigation";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  validateSearch: (s: Record<string, unknown>): { autostart?: boolean | undefined } =>
    s["autostart"] === true || s["autostart"] === "true" ? { autostart: true } : {},
  head: () => ({
    meta: [
      { title: "Project audit — ProofChain.AI" },
      { name: "description", content: "Claims, tests, findings and fixes for this project." },
      { property: "og:title", content: "Project audit — ProofChain.AI" },
      { property: "og:description", content: "Project audit workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { workspaceMode } = Route.useRouteContext();
  const { id } = Route.useParams();
  if (workspaceMode === "cloud") return <CloudProject />;
  const project = readBrowserProjects().find((item) => item.id === id);
  if (!project) return <p>Project not found in this browser.</p>;
  const details = [
    ["Description", project.description],
    ["Requirements", project.requirements],
    ["Progress report", project.progress_report],
    ["Website", project.website_url],
    ["GitHub repository", project.github_url],
  ];
  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">{project.name}</h1>
      <p className="text-muted-foreground">
        Saved in this browser. File evidence and AI audits use the cloud workspace.
      </p>
      <BrowserVerification website={project.website_url} repository={project.github_url} />
      <dl className="space-y-4">
        {details
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="font-semibold">{label}</dt>
              <dd className="whitespace-pre-wrap break-words">{value}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

function CloudProject() {
  const { id } = Route.useParams();
  const { autostart } = Route.useSearch();
  const { data, isLoading, error } = useQuery(projectQuery(id));
  const live = useLiveAudit(id, data?.latestRun?.id);
  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  if (error || !data) return <p className="text-destructive">Project not found.</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">{data.project.name}</h1>
        {data.project.is_demo && (
          <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs text-warning">
            Demonstration data
          </span>
        )}
        {data.latestRun?.verdict && <Status value={data.latestRun.verdict} />}
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        {live ? "LIVE VERIFICATION CONNECTED" : "VERIFICATION UPDATES EVERY 10 SECONDS"}
      </p>
      <FeatureNavigation id={id} />
      <Intelligence d={data} />
      {autostart && <AuditPanel d={data} autostart />}
      <section className="space-y-4">
        <h2 className="font-semibold">Project features</h2>
        <FeatureGrid id={id} />
      </section>
      <Overview d={data} />
      <Milestones d={data} />
      <Investigator d={data} />
      <ProjectManager d={data} />
    </div>
  );
}
