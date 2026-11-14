import { useQuery } from "@tanstack/react-query";
import { milestoneQuery } from "./Milestones";
import { milestoneProgress } from "@/lib/engine/milestones";
import { jsPDF } from "jspdf";
import { Download, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectData } from "./data";
import { auditIntelligence } from "@/lib/engine/intelligence";

function build(d: ProjectData) {
  return {
    generated_at: new Date().toISOString(),
    project: {
      name: d.project.name,
      website: d.project.website_url,
      github: d.project.github_url,
      demonstration_data: d.project.is_demo,
    },
    audit: d.latestRun && {
      id: d.latestRun.id,
      status: d.latestRun.status,
      verdict: d.latestRun.verdict,
      readiness: d.latestRun.readiness,
      summary: d.latestRun.summary,
    },
    evidence: d.evidence.map((e) => ({
      id: e.id,
      title: e.title,
      source: e.source,
      created_at: e.created_at,
    })),
    claims: d.claims.map((c) => ({
      text: c.text,
      requirement: c.requirement,
      status: c.status,
      reason: c.reason,
    })),
    tests: d.runTests.map((t) => ({
      type: t.test_type,
      target: t.target,
      passed: t.passed,
      retest: t.is_retest,
      details: t.details,
    })),
    findings: d.findings.map((f) => ({
      title: f.title,
      severity: f.severity,
      status: f.status,
      hypotheses: f.hypotheses,
    })),
    fixes: d.fixes.map((x) => ({
      file: x.file_path,
      status: x.status,
      retest_passed: x.retest_passed,
    })),
    ai_executions: d.aiExecutions.filter((e) => e.runId === d.latestRun?.id),
    intelligence: auditIntelligence(
      d.claims,
      d.runTests,
      d.tests.filter(
        (t) => t.audit_run_id !== d.latestRun?.id && t.created_at < (d.latestRun?.created_at ?? ""),
      ),
    ),
    agent_tool_calls: d.tools.map((t) => ({ step: t.step, tool: t.tool, status: t.status })),
  };
}
const save = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

export function ReportPanel({ d }: { d: ProjectData }) {
  const { data: milestones } = useQuery(milestoneQuery(d.project.id));
  const r = {
    ...build(d),
    milestones: milestones?.milestones ?? [],
    milestone_reviews: milestones?.reviews ?? [],
    milestone_progress: milestones
      ? milestoneProgress(milestones.milestones, milestones.reviews)
      : null,
  };
  const slug = d.project.name.replace(/\W+/g, "-").toLowerCase();
  const pdf = () => {
    const doc = new jsPDF();
    let y = 18;
    const W = 180;
    const line = (t: string, size = 10, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      for (const l of doc.splitTextToSize(t, W)) {
        if (y > 280) {
          doc.addPage();
          y = 18;
        }
        doc.text(l, 15, y);
        y += size * 0.5;
      }
      y += 2;
    };
    line("ProofChain.AI Audit Report", 18, true);
    line(`${r.project.name}${r.project.demonstration_data ? " (DEMONSTRATION DATA)" : ""}`, 12);
    line(`Generated ${new Date().toLocaleString()} · Target: ${r.project.website ?? "—"}`, 9);
    line(`Verdict: ${r.audit?.verdict ?? "UNKNOWN"}`, 14, true);
    if (r.audit?.summary) line(r.audit.summary);
    line("AI execution accuracy", 13, true);
    line(
      `Evidence trust score: ${r.intelligence.trustScore ?? "Not measured"}${r.intelligence.trustScore === null ? "" : "/100"}. Evidence-v1: 70% claim support, 30% latest test pass rate. Not AI accuracy.`,
      9,
    );
    line("Anomalies", 13, true);
    r.intelligence.anomalies.forEach((a) => line(`${a.kind}: ${a.title} - ${a.reason}`, 9));
    if (r.ai_executions.length)
      r.ai_executions.forEach((e) =>
        line(`${e.action}: accuracy not measured | ${e.status} | ${e.executedAt}. ${e.reason}`, 9),
      );
    else line("No accuracy records for this audit.", 9);
    line("Claims", 13, true);
    r.claims.forEach((c) => line(`• [${c.status}] ${c.text} — ${c.reason}`, 9));
    line("Tests", 13, true);
    r.tests.forEach((t) =>
      line(
        `• ${t.passed ? "PASS" : "FAIL"} ${t.type}${t.retest ? " (retest)" : ""}: ${t.details}`,
        9,
      ),
    );
    line("Findings", 13, true);
    r.findings.forEach((f) => line(`• [${f.severity}/${f.status}] ${f.title}`, 9));
    line("Fixes", 13, true);
    if (r.fixes.length)
      r.fixes.forEach((x) =>
        line(
          `• ${x.file}: ${x.status}, retest ${x.retest_passed == null ? "n/a" : x.retest_passed ? "passed" : "failed"}`,
          9,
        ),
      );
    else line("None", 9);
    line("Evidence references", 13, true);
    r.evidence.forEach((e) => line(`${e.id}: ${e.title} | ${e.source} | ${e.created_at}`, 9));
    line("Milestone progress", 13, true);
    if (r.milestone_progress)
      line(
        `Claimed: ${r.milestone_progress.claimed.toFixed(1)}%. AI evidence-supported: ${r.milestone_progress.assessed ? r.milestone_progress.supported.toFixed(1) + "%" : "Not Yet Assessed"}. Gap: ${r.milestone_progress.gap.toFixed(1)}%.`,
        9,
      );
    r.milestones.forEach((m) =>
      line(
        `${m.title}: weight ${m.weight}, claimed ${m.claimed_progress}%. Criteria: ${m.acceptance_criteria}`,
        9,
      ),
    );
    r.milestone_reviews.forEach((review) => {
      line(`Assessment ${review.id} | ${review.model} | ${review.created_at}`, 10, true);
      line(`${review.result.claim_status}: ${review.result.explanation}`, 9);
      line(`Evidence IDs: ${review.result.evidence_ids.join(", ")}`, 9);
      [
        ...review.result.missing_evidence,
        ...review.result.contradictions,
        ...review.result.recommendations,
      ].forEach((t) => line(t, 9));
    });
    doc.save(`proofchain-${slug}.pdf`);
  };
  return (
    <section className="border-t border-border py-5">
      <h2 className="font-semibold">Reports</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {d.latestRun
          ? "Export the latest audit with all claims, tests, findings and fixes."
          : "Run an audit first."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="hero" disabled={!d.latestRun && !r.milestone_reviews.length} onClick={pdf}>
          <Download className="mr-1 h-4 w-4" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          disabled={!d.latestRun && !r.milestone_reviews.length}
          onClick={() =>
            save(
              new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }),
              `proofchain-${slug}.json`,
            )
          }
        >
          <FileJson className="mr-1 h-4 w-4" />
          Download JSON
        </Button>
      </div>
    </section>
  );
}
