import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Image, Loader2 } from "lucide-react";
import type { ProjectData } from "./data";

export function BrowserEvidence({
  logs,
  evidence,
}: {
  logs: string[];
  evidence: ProjectData["evidence"];
}) {
  const id = logs.find((l) => l.startsWith("BROWSER_EVIDENCE:"))?.slice("BROWSER_EVIDENCE:".length);
  const item = evidence.find((e) => e.id === id);
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!item?.storage_path) return null;
  return (
    <div className="mt-3 space-y-3">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(undefined);
          try {
            const { data, error } = await supabase.storage
              .from("evidence")
              .createSignedUrl(item.storage_path ?? "", 120);
            if (error || !data) throw new Error("Screenshot unavailable. Try again.");
            setUrl(data.signedUrl);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Screenshot unavailable");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Image className="size-4" />}View
        browser capture
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {url && (
        <img
          src={url}
          alt={item.title}
          className="max-h-[600px] w-full rounded-md border border-border object-contain object-left"
        />
      )}
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary/50 p-3 font-mono text-xs">
        {item.extracted_text}
      </pre>
    </div>
  );
}
