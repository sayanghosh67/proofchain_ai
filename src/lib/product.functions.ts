/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { geminiJSON, GEMINI_MODEL, untrusted } from "@/lib/engine/gemini";
import { assertConsent } from "@/lib/engine/intelligence";
import { MilestoneSchema, ReviewSchema } from "@/lib/engine/milestones";
type Context = { supabase: any; userId: string };
const id = z.string().uuid();
async function project(ctx: Context, projectId: string) {
  const { data, error } = await ctx.supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", ctx.userId)
    .single();
  if (error || !data) throw new Error("Project not found or access denied");
  return data;
}
export async function aiBudget(ctx: Context) {
  const { data, error } = await ctx.supabase.rpc("proofchain_consume_ai_budget");
  if (error)
    throw new Error(
      "AI rate limiting is not configured. Apply database/002_product_workflows.sql.",
    );
  if (!data) throw new Error("AI request limit reached. Retry in one minute.");
}
export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      projectId: id,
      name: z.string().trim().min(1).max(120),
      description: z.string().max(4000),
      requirements: z.string().max(20000),
      progress_report: z.string().max(20000),
      website_url: z.union([z.url(), z.literal("")]),
      github_url: z.string().regex(/^(https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?|)$/),
    }),
  )
  .handler(async ({ data, context }) => {
    await project(context, data.projectId);
    const { projectId, ...values } = data;
    const { error } = await context.supabase
      .from("projects")
      .update({
        ...values,
        website_url: values.website_url || null,
        github_url: values.github_url || null,
      })
      .eq("id", projectId)
      .eq("user_id", context.userId);
    if (error) throw error;
    const { error: staleError } = await (context.supabase as any)
      .from("milestones")
      .update({ updated_at: new Date().toISOString() })
      .eq("project_id", projectId);
    if (staleError) throw staleError;
    return { ok: true };
  });
export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: id, confirmation: z.string() }))
  .handler(async ({ data, context }) => {
    const p = await project(context, data.projectId);
    if (data.confirmation !== p.name)
      throw new Error("Enter the exact project name to confirm deletion");
    const { data: files, error: readError } = await context.supabase
      .from("evidence")
      .select("storage_path")
      .eq("project_id", p.id);
    if (readError) throw readError;
    const paths = (files ?? []).flatMap((f) => (f.storage_path ? [f.storage_path] : []));
    if (paths.length) {
      const { error } = await context.supabase.storage.from("evidence").remove(paths);
      if (error) throw error;
    }
    const { error } = await context.supabase
      .from("projects")
      .delete()
      .eq("id", p.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
export const saveMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: id, milestoneId: id.optional(), values: MilestoneSchema }))
  .handler(async ({ data, context }) => {
    await project(context, data.projectId);
    const db = context.supabase as any;
    if (data.values.evidence_ids.length) {
      const { data: evidence, error } = await db
        .from("evidence")
        .select("id")
        .eq("project_id", data.projectId)
        .in("id", data.values.evidence_ids)
        .neq("source", "ai_execution");
      if (error || evidence.length !== new Set(data.values.evidence_ids).size)
        throw new Error("Evidence must belong to this project");
    }
    const values = { ...data.values, updated_at: new Date().toISOString() };
    const q = data.milestoneId
      ? db
          .from("milestones")
          .update(values)
          .eq("id", data.milestoneId)
          .eq("project_id", data.projectId)
          .eq("user_id", context.userId)
      : db
          .from("milestones")
          .insert({ ...values, project_id: data.projectId, user_id: context.userId });
    const { data: row, error } = await q.select().single();
    if (error) throw new Error(error.message);
    return row;
  });
export const deleteMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: id, milestoneId: id }))
  .handler(async ({ data, context }) => {
    await project(context, data.projectId);
    const { error } = await (context.supabase as any)
      .from("milestones")
      .delete()
      .eq("id", data.milestoneId)
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
export const reviewMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: id, milestoneId: id }))
  .handler(async ({ data, context }) => {
    const p = await project(context, data.projectId);
    assertConsent(p, "ai");
    await aiBudget(context);
    const db = context.supabase as any;
    const { data: m, error } = await db
      .from("milestones")
      .select("*")
      .eq("id", data.milestoneId)
      .eq("project_id", p.id)
      .single();
    if (error || !m) throw new Error("Milestone not found");
    const { data: evidence, error: evError } = await db
      .from("evidence")
      .select("id,title,kind,source,extracted_text,sha256,created_at")
      .eq("project_id", p.id)
      .in("id", m.evidence_ids)
      .neq("source", "ai_execution");
    if (evError) throw evError;
    const allowed = evidence.filter((e: any) => e.kind !== "code" || p.code_consent);
    const { data: tests, error: testError } = await db
      .from("test_results")
      .select("id,test_type,passed,details,created_at")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (testError) throw testError;
    const snapshot = {
      milestone: m,
      evidence: allowed,
      tests,
      project: { name: p.name, description: p.description },
    };
    const result = await geminiJSON(
      ReviewSchema,
      `Evaluate this milestone against its acceptance criteria and linked evidence. This is an AI evidence assessment, not independent proof. The only factual test results are supplied records. A README, a claim, a commit count, or a keyword match cannot prove completion. Only mark verified if all stated criteria are supported by specific supplied evidence. For missing or ambiguous evidence use insufficient_evidence or unsupported. Cite only supplied evidence UUIDs. Do not infer image authenticity. supported_progress is 0 unless verified. Confidence is assessment confidence, not fraud probability.`,
      untrusted("milestone assessment", JSON.stringify(snapshot)),
    );
    if (result.evidence_ids.some((eid) => !allowed.some((e: any) => e.id === eid)))
      throw new Error("Gemini returned an unknown evidence reference");
    if (
      result.claim_status === "verified" &&
      (!result.evidence_ids.length ||
        !result.supported_criteria.length ||
        result.missing_evidence.length ||
        result.contradictions.length)
    )
      throw new Error("Gemini returned an inconsistent verification result");
    const { error: saveError } = await db.from("evidence_reviews").insert({
      user_id: context.userId,
      project_id: p.id,
      milestone_id: m.id,
      model: GEMINI_MODEL,
      result,
      input_snapshot: snapshot,
    });
    if (saveError) throw saveError;
    return result;
  });
export const askInvestigator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: id, question: z.string().trim().min(1).max(2000) }))
  .handler(async ({ data, context }) => {
    const p = await project(context, data.projectId);
    assertConsent(p, "ai");
    await aiBudget(context);
    const db = context.supabase as any;
    const results = await Promise.all([
      db
        .from("evidence")
        .select("id,title,kind,extracted_text")
        .eq("project_id", p.id)
        .neq("source", "ai_execution")
        .limit(40),
      db
        .from("evidence_reviews")
        .select("id,milestone_id,result,created_at")
        .eq("project_id", p.id)
        .order("created_at", { ascending: false })
        .limit(20),
      db.from("claims").select("id,text,status,reason").eq("project_id", p.id).limit(40),
      db
        .from("investigator_messages")
        .select("question,answer")
        .eq("project_id", p.id)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    for (const r of results) if (r.error) throw r.error;
    const evidence = results[0]!.data
      .filter((e: any) => e.kind !== "code" || p.code_consent)
      .map((e: any) => ({ ...e, extracted_text: e.extracted_text.slice(0, 1500) }));
    const answer = await geminiJSON(
      z.object({ answer: z.string().min(1).max(12000), evidence_ids: z.array(id).max(30) }),
      "Answer the user's project audit question using only the supplied records. Reference evidence IDs in the answer when relevant. Clearly say when information is missing. Distinguish AI assessments from deterministic test results. Never claim access to another project. Return answer and evidence_ids.",
      untrusted(
        "project question",
        JSON.stringify({
          question: data.question,
          project: { name: p.name, description: p.description },
          evidence,
          reviews: results[1]!.data,
          claims: results[2]!.data,
          conversation: results[3]!.data.reverse(),
        }),
      ),
    );
    if (answer.evidence_ids.some((eid) => !evidence.some((e: any) => e.id === eid)))
      throw new Error("Gemini returned an unknown citation");
    const { error } = await db.from("investigator_messages").insert({
      user_id: context.userId,
      project_id: p.id,
      question: data.question,
      ...answer,
      model: GEMINI_MODEL,
    });
    if (error) throw error;
    return answer;
  });
export const deleteEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: id, evidenceId: id }))
  .handler(async ({ data, context }) => {
    await project(context, data.projectId);
    const { data: ev, error } = await context.supabase
      .from("evidence")
      .select("*")
      .eq("id", data.evidenceId)
      .eq("project_id", data.projectId)
      .single();
    if (error || !ev) throw new Error("Evidence not found");
    if (ev.storage_path) {
      const { error } = await context.supabase.storage.from("evidence").remove([ev.storage_path]);
      if (error) throw error;
    }
    const { error: removeError } = await context.supabase.from("evidence").delete().eq("id", ev.id);
    if (removeError) throw removeError;
    // Invalidate affected milestone assessments; retained snapshots remain historical.
    const db = context.supabase as any;
    const { data: milestones, error: lookupError } = await db
      .from("milestones")
      .select("id,evidence_ids")
      .eq("project_id", data.projectId)
      .contains("evidence_ids", [ev.id]);
    if (lookupError) throw lookupError;
    for (const m of milestones) {
      const { error } = await db
        .from("milestones")
        .update({
          evidence_ids: m.evidence_ids.filter((id: string) => id !== ev.id),
          updated_at: new Date().toISOString(),
        })
        .eq("id", m.id);
      if (error) throw error;
    }
    return { ok: true };
  });
