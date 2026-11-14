import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Input } from "@/components/ui/input";
import type { ProjectData } from "./data";

const KINDS = {
  requirement: "var(--violet)",
  claim: "var(--accent)",
  evidence: "var(--chart-4)",
  test: "var(--primary)",
  finding: "var(--destructive)",
} as const;
type Kind = keyof typeof KINDS;

export function GraphPanel({ d }: { d: ProjectData }) {
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState<Set<Kind>>(new Set());
  const [sel, setSel] = useState<{ kind: string; detail: string } | null>(null);
  const { nodes, edges } = useMemo(() => {
    const n: (Node & { kind: Kind; detail: string })[] = [];
    const e: Edge[] = [];
    const add = (id: string, kind: Kind, label: string, x: number, y: number, detail: string) =>
      n.push({
        id,
        kind,
        detail,
        position: { x, y },
        data: { label: label.slice(0, 60) },
        style: {
          background: "var(--popover)",
          color: "var(--foreground)",
          border: `1px solid ${KINDS[kind]}`,
          borderRadius: 10,
          fontSize: 11,
          width: 190,
        },
      });
    const reqs = [...new Set(d.claims.map((c) => c.requirement).filter(Boolean))] as string[];
    reqs.forEach((r, i) => add(`r${i}`, "requirement", r, 0, i * 90, r));
    d.claims.forEach((c, i) => {
      add(
        c.id,
        "claim",
        `${c.text} [${c.status}]`,
        260,
        i * 90,
        `${c.text}\nStatus: ${c.status}\n${c.reason}`,
      );
      const ri = reqs.indexOf(c.requirement ?? "");
      if (ri >= 0) e.push({ id: `e-r${ri}-${c.id}`, source: `r${ri}`, target: c.id });
      c.evidence_ids.forEach((ev) =>
        e.push({ id: `e-${ev}-${c.id}`, source: ev, target: c.id, animated: true }),
      );
    });
    d.evidence.forEach((ev, i) =>
      add(
        ev.id,
        "evidence",
        ev.title,
        0,
        (reqs.length + i) * 90 + 40,
        ev.extracted_text.slice(0, 400),
      ),
    );
    const tests = d.runTests;
    tests.forEach((t, i) => {
      add(
        t.id,
        "test",
        `${t.test_type} ${t.passed ? "✓" : "✗"}${t.is_retest ? " (retest)" : ""}`,
        540,
        i * 90,
        t.details,
      );
      d.claims
        .filter((c) => c.test_type === t.test_type)
        .forEach((c) => e.push({ id: `e-${c.id}-${t.id}`, source: c.id, target: t.id }));
    });
    d.findings.forEach((f, i) => {
      add(
        f.id,
        "finding",
        `${f.title} [${f.status}]`,
        820,
        i * 90,
        `${f.severity}\n${f.repro_steps}`,
      );
      if (f.test_result_id)
        e.push({ id: `e-${f.test_result_id}-${f.id}`, source: f.test_result_id, target: f.id });
    });
    const vis = n.filter(
      (x) =>
        !hidden.has(x.kind) &&
        (!q || String(x.data["label"]).toLowerCase().includes(q.toLowerCase())),
    );
    const ids = new Set(vis.map((x) => x.id));
    return {
      nodes: vis,
      edges: e
        .filter((x) => ids.has(x.source) && ids.has(x.target))
        .map((x) => ({ ...x, style: { stroke: "var(--muted-foreground)" } })),
    };
  }, [d, q, hidden]);
  return (
    <section className="glass p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">Evidence graph</h2>
        <Input
          className="w-48"
          placeholder="Search nodes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => {
              const s = new Set(hidden);
              if (s.has(k)) s.delete(k);
              else s.add(k);
              setHidden(s);
            }}
            className="rounded-full border px-2.5 py-1 text-xs"
            style={{ borderColor: KINDS[k], opacity: hidden.has(k) ? 0.4 : 1 }}
          >
            {k}
          </button>
        ))}
      </div>
      {nodes.length ? (
        <div className="h-[560px] rounded-lg border border-border">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            colorMode="dark"
            onNodeClick={(_, n) =>
              setSel({
                kind: (n as unknown as { kind: string }).kind,
                detail: (n as unknown as { detail: string }).detail,
              })
            }
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Run an audit to build the graph.
        </p>
      )}
      {sel && (
        <div className="mt-3 rounded-lg border border-border p-3 text-sm">
          <p className="text-xs uppercase text-muted-foreground">{sel.kind}</p>
          <pre className="whitespace-pre-wrap font-sans">{sel.detail}</pre>
        </div>
      )}
    </section>
  );
}
