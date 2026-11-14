import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLiveAudit(projectId?: string, runId?: string) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: projectId ? ["project", projectId] : ["dashboard"] });
      }, 250);
    };
    const channel = supabase.channel(`audit-${crypto.randomUUID()}`);
    const tables = projectId
      ? ["audit_runs", "claims", "test_results", "findings", "fix_proposals", "evidence"]
      : ["projects", "claims", "audit_runs", "test_results", "findings"];
    for (const table of tables)
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {}),
        },
        refresh,
      );
    if (projectId)
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `id=eq.${projectId}` },
        refresh,
      );
    if (runId)
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tool_calls", filter: `audit_run_id=eq.${runId}` },
        refresh,
      );
    channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    const fallback = setInterval(refresh, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [projectId, runId, qc]);
  return connected;
}
