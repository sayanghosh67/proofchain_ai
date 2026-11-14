import { readBrowserProjects } from "@/lib/browser-projects";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FlaskConical, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/pc/Status";
import { useLiveAudit } from "@/components/pc/ws/useLiveAudit";
import { FeatureGrid } from "@/components/pc/ws/FeatureNavigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (s: Record<string, unknown>): { demo?: boolean | undefined } =>
    s["demo"] === true || s["demo"] === "true" ? { demo: true } : {},
  head: () => ({
    meta: [
      { title: "Mission Control — ProofChain.AI" },
      { name: "description", content: "All your project audits at a glance." },
      { property: "og:title", content: "Mission Control — ProofChain.AI" },
      { property: "og:description", content: "Audit overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function useStats() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [p, c, t, f, a] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, is_demo, created_at")
          .eq("is_demo", false)
          .order("created_at", { ascending: false }),
        supabase.from("claims").select("status"),
        supabase.from("test_results").select("passed, test_type"),
        supabase.from("findings").select("severity, status").not("test_result_id", "is", null),
        supabase
          .from("audit_runs")
          .select("id, project_id, status, verdict, created_at, projects(name)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      for (const result of [p, c, t, f, a]) if (result.error) throw result.error;
      return {
        projects: p.data ?? [],
        claims: c.data ?? [],
        tests: t.data ?? [],
        findings: f.data ?? [],
        audits: a.data ?? [],
      };
    },
  });
}

function Dashboard() {
  const { workspaceMode } = Route.useRouteContext();
  return workspaceMode === "browser" ? <BrowserDashboard /> : <CloudDashboard />;
}

function BrowserDashboard() {
  const projects = readBrowserProjects();
  const [selectedId, setSelectedId] = useState("");
  const activeProject = projects.find((project) => project.id === selectedId) ?? projects[0];
  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold">Mission Control</h1>
      <p className="text-muted-foreground">
        Projects are saved in this browser. Evidence uploads and audits require the cloud workspace.
      </p>
      <Button asChild variant="hero">
        <Link to="/projects/new">Create project</Link>
      </Button>
      {projects.length ? (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                className="block rounded-lg border p-4 hover:bg-muted"
                to="/projects/$id"
                params={{ id: project.id }}
                search={{ autostart: undefined }}
              >
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No projects yet.</p>
      )}
      <section className="space-y-4" aria-labelledby="dashboard-features">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="dashboard-features" className="text-xl font-semibold">
            Project features
          </h2>
          {activeProject && (
            <Select value={activeProject.id} onValueChange={setSelectedId}>
              <SelectTrigger aria-label="Project for feature links" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <FeatureGrid {...(activeProject ? { id: activeProject.id } : {})} browser />
      </section>
    </section>
  );
}

function CloudDashboard() {
  const live = useLiveAudit();
  const [selectedProject, setSelectedProject] = useState("");
  const { data, isLoading, error } = useStats();
  const cnt = (s: string) => data?.claims.filter((c) => c.status === s).length ?? 0;
  const stats = data && [
    ["Projects", data.projects.length],
    ["Verified claims", cnt("verified")],
    ["Unsupported", cnt("unsupported")],
    ["Contradicted", cnt("contradicted")],
    ["Failed tests", data.tests.filter((t) => !t.passed).length],
    [
      "Critical open",
      data.findings.filter(
        (f) => f.status === "open" && (f.severity === "critical" || f.severity === "high"),
      ).length,
    ],
    [
      "Evidence coverage",
      data.claims.length
        ? `${Math.round((data.claims.filter((c) => ["verified", "partially_verified", "contradicted"].includes(c.status)).length / data.claims.length) * 100)}%`
        : "—",
    ],
  ];
  const byType = data
    ? Object.entries(
        data.tests.reduce<Record<string, { type: string; pass: number; fail: number }>>((m, t) => {
          (m[t.test_type] ??= { type: t.test_type.replace(/_/g, " "), pass: 0, fail: 0 })[
            t.passed ? "pass" : "fail"
          ]++;
          return m;
        }, {}),
      ).map(([, v]) => v)
    : [];
  const activeProject = data?.projects.find((p) => p.id === selectedProject) ?? data?.projects[0];

  if (error)
    return (
      <p role="alert" className="text-destructive">
        Could not load your dashboard: {error.message}
      </p>
    );
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 font-mono text-[10px] text-primary">
            YOUR PROJECTS. THE REAL PICTURE.
          </p>
          <h1 className="text-3xl font-semibold">Mission Control</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {live
              ? "Live progress verification connected."
              : "Progress verification updates every 10 seconds."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="hero">
            <Link to="/projects/new">
              <Plus className="mr-1 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : stats?.map(([k, v]) => (
              <div key={k as string} className="glass p-4">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="mt-2 text-2xl font-semibold">{v}</p>
              </div>
            ))}
      </div>
      <section className="space-y-5 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Feature control center</h2>
          {activeProject && (
            <Select value={activeProject.id} onValueChange={setSelectedProject}>
              <SelectTrigger aria-label="Select feature project" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data?.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {activeProject ? (
          <FeatureGrid id={activeProject.id} />
        ) : (
          <div className="flex flex-wrap items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground">No project selected.</p>
            <Button asChild variant="outline">
              <Link to="/projects/new">Create a project</Link>
            </Button>
          </div>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-t border-border py-5">
          <h2 className="font-semibold">Test results by type</h2>
          {byType.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <BarChart data={byType}>
                  <XAxis dataKey="type" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Bar dataKey="pass" stackId="a" fill="var(--chart-1)" />
                  <Bar dataKey="fail" stackId="a" fill="var(--chart-5)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text="No tests yet. Run an audit to see results." />
          )}
        </div>
        <div className="border-t border-border py-5">
          <h2 className="font-semibold">Recent audits</h2>
          {data?.audits.length ? (
            <ul className="mt-3 divide-y divide-border">
              {data.audits.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/projects/$id"
                    params={{ id: a.project_id }}
                    search={{ autostart: undefined }}
                    className="flex items-center justify-between py-3 text-sm hover:text-primary"
                  >
                    <span>
                      {(a.projects as { name: string } | null)?.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </span>
                    {a.verdict ? (
                      <Status value={a.verdict} />
                    ) : (
                      <span className="text-xs text-muted-foreground">{a.status}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No audits yet." />
          )}
        </div>
      </div>
      <div className="border-t border-border py-5">
        <h2 className="font-semibold">Projects</h2>
        {data?.projects.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                search={{ autostart: undefined }}
                className="rounded-lg border border-border p-4 hover:border-primary/50"
              >
                <p className="font-medium">{p.name}</p>
                {p.is_demo && <span className="text-xs text-warning">Demonstration data</span>}
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="Create your first project to start collecting evidence." />
        )}
      </div>
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center py-10 text-center text-sm text-muted-foreground">
    <FlaskConical className="mb-2 h-6 w-6 opacity-50" />
    {text}
  </div>
);
