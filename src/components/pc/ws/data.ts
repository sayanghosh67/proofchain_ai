import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseAIExecution, type AIExecution } from "@/lib/engine/ai-accuracy";

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: async () => {
      const [p, ev, runs, cl, tr, fi, fx] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("evidence").select("*").eq("project_id", id).order("created_at"),
        supabase
          .from("audit_runs")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("claims").select("*").eq("project_id", id).order("created_at"),
        supabase.from("test_results").select("*").eq("project_id", id).order("created_at"),
        supabase.from("findings").select("*").eq("project_id", id).order("created_at"),
        supabase
          .from("fix_proposals")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false }),
      ]);
      for (const result of [p, ev, runs, cl, tr, fi, fx]) if (result.error) throw result.error;
      if (!p.data) throw new Error("Project not found");
      const latestRun = runs.data?.[0] ?? null;
      const runId = latestRun?.id;
      const tools = runId
        ? ((await supabase.from("tool_calls").select("*").eq("audit_run_id", runId).order("step"))
            .data ?? [])
        : [];
      return {
        project: p.data,
        evidence: (ev.data ?? []).filter((e) => e.source !== "ai_execution"),
        aiExecutions: (ev.data ?? [])
          .filter((e) => e.source === "ai_execution")
          .map((e) => parseAIExecution(e.extracted_text))
          .filter((e): e is AIExecution => e !== null)
          .reverse(),
        runs: runs.data ?? [],
        latestRun,
        tools,
        claims: (cl.data ?? []).filter((c) => c.audit_run_id === runId),
        tests: tr.data ?? [],
        runTests: (tr.data ?? []).filter(
          (t) => t.audit_run_id === runId || (t.is_retest && t.audit_run_id === runId),
        ),
        findings: (fi.data ?? []).filter((f) => f.audit_run_id === runId),
        fixes: fx.data ?? [],
      };
    },
  });
export type ProjectData = Awaited<
  ReturnType<NonNullable<ReturnType<typeof projectQuery>["queryFn"]>>
>;
