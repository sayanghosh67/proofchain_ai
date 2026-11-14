import { useState } from "react";
import { Button } from "@/components/ui/button";

type Report = {
  checkedAt: string;
  checks: { name: string; status: string; detail: string }[];
};

export function BrowserVerification({
  website,
  repository,
}: {
  website: string;
  repository: string;
}) {
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report>();

  async function run() {
    setBusy(true);
    setError("");
    setReport(undefined);
    try {
      const response = await fetch("/api/public/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website, repository }),
        signal: AbortSignal.timeout(35000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Verification failed.");
      setReport(result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border p-5">
      <h2 className="text-xl font-semibold">Project verification</h2>
      <p className="text-sm text-muted-foreground">
        Check the website response, selected security headers, and recent public GitHub activity.
        Your requirements still need separate evidence or browser tests.
      </p>
      {website && (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(event) => setAuthorized(event.target.checked)}
          />
          I own this website or have permission to test it.
        </label>
      )}
      {!website && !repository && (
        <p className="text-sm">
          Add a public website or GitHub URL when creating a project to run these checks.
        </p>
      )}
      <Button
        onClick={() => void run()}
        disabled={busy || Boolean(website && !authorized) || (!website && !repository)}
      >
        {busy ? "Checking…" : "Run verification"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {report && (
        <div aria-live="polite" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Checked {new Date(report.checkedAt).toLocaleString()}
          </p>
          <ul className="space-y-2">
            {report.checks.map((check) => (
              <li key={check.name} className="rounded border p-3">
                <p className="font-semibold">
                  {check.name} · {check.status}
                </p>
                <p className="break-words text-sm text-muted-foreground">{check.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
