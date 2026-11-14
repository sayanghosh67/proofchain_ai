/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import { assertConsent } from "@/lib/engine/intelligence";

const CODE = /\.(tsx?|jsx?|py|go|rs|java|c|cpp|css|html)$/i;
const TEXT = /\.(txt|md|log|json|csv|tsx?|jsx?|py|go|rs|java|c|cpp|css|html)$/i;
const OK = /\.(txt|md|log|json|csv|tsx?|jsx?|py|go|rs|java|c|cpp|css|html|png|jpe?g|webp|pdf)$/i;

export async function uploadEvidence(projectId: string, file: File) {
  if (!OK.test(file.name)) throw new Error("File type not allowed");
  if (file.size > 10 * 1024 * 1024) throw new Error("File larger than 10MB");
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to upload evidence");
  if (CODE.test(file.name)) {
    const { data: p, error } = await supabase
      .from("projects")
      .select("is_demo, code_consent")
      .eq("id", projectId)
      .single();
    if (error || !p) throw new Error("Project not found");
    assertConsent(p, "code");
  }
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  const db = supabase as any;
  const { data: duplicates, error: lookupError } = await db
    .from("evidence")
    .select("id")
    .eq("project_id", projectId)
    .eq("sha256", sha256)
    .limit(1);
  if (lookupError) throw lookupError;
  if (duplicates.length)
    throw new Error("This file is already stored in this project (SHA-256 match)");
  const safe = file.name.replace(/[^\w.-]/g, "_").slice(-80);
  const path = `${u.user.id}/${projectId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage
    .from("evidence")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  const extracted = TEXT.test(file.name)
    ? (await file.text()).slice(0, 50000)
    : file.type === "application/pdf"
      ? "PDF stored. Choose Analyze with Gemini to extract and assess its contents."
      : "";
  const kind = CODE.test(file.name)
    ? "code"
    : file.type.startsWith("image/")
      ? "screenshot"
      : /report/i.test(file.name)
        ? "report"
        : TEXT.test(file.name)
          ? "log"
          : "file";
  const { data, error: e2 } = await db
    .from("evidence")
    .insert({
      sha256,
      user_id: u.user.id,
      project_id: projectId,
      title: file.name,
      storage_path: path,
      mime_type: file.type,
      extracted_text: extracted,
      kind,
    })
    .select()
    .single();
  if (e2) {
    await supabase.storage.from("evidence").remove([path]);
    throw e2;
  }
  return data;
}
