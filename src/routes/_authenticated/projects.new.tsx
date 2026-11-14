import { saveBrowserProject } from "@/lib/browser-projects";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createProject } from "@/lib/audit.functions";
import { uploadEvidence } from "@/lib/evidence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConsentFields, defaultConsent } from "@/components/pc/ws/ConsentFields";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({
    meta: [
      { title: "New Project — ProofChain.AI" },
      { name: "description", content: "Create a project to audit." },
      { property: "og:title", content: "New Project — ProofChain.AI" },
      { property: "og:description", content: "Create a project to audit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewProject,
});

function NewProject() {
  const nav = useNavigate();
  const { workspaceMode } = Route.useRouteContext();
  const create = useServerFn(createProject);
  const [f, setF] = useState({
    name: "",
    description: "",
    requirements: "",
    progress_report: "",
    website_url: "",
    github_url: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(defaultConsent);
  const set =
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { id } =
        workspaceMode === "browser"
          ? { id: saveBrowserProject(f) }
          : await create({ data: { ...f, ...consent } });
      for (const file of files)
        await uploadEvidence(id, file).catch((err) => toast.error(`${file.name}: ${err.message}`));
      toast.success("Project saved");
      nav({ to: "/projects/$id", params: { id }, search: { autostart: undefined } });
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="project-form mx-auto max-w-3xl space-y-5">
      <div className="editorial-page-heading">
        <p className="mb-3 font-mono text-xs text-primary">01 / START THE CHAIN</p>
        <h1 className="text-3xl font-bold">
          New Project<span className="text-primary">.</span>
        </h1>
      </div>
      <div>
        <Label htmlFor="n">Project name</Label>
        <Input id="n" required value={f.name} onChange={set("name")} />
      </div>
      <div>
        <Label htmlFor="d">Description</Label>
        <Textarea id="d" value={f.description} onChange={set("description")} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="w">Website URL (authorized test target)</Label>
          <Input
            id="w"
            type="url"
            placeholder="https://…"
            value={f.website_url}
            onChange={set("website_url")}
          />
        </div>
        <div>
          <Label htmlFor="g">Public GitHub URL</Label>
          <Input
            id="g"
            placeholder="https://github.com/owner/repo"
            value={f.github_url}
            onChange={set("github_url")}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="r">Requirements</Label>
        <Textarea
          id="r"
          rows={4}
          placeholder="R1: Users can sign in…"
          value={f.requirements}
          onChange={set("requirements")}
        />
      </div>
      <div>
        <Label htmlFor="p">Progress report</Label>
        <Textarea
          id="p"
          rows={5}
          placeholder="Paste the status update you want verified"
          value={f.progress_report}
          onChange={set("progress_report")}
        />
      </div>
      {workspaceMode === "browser" ? (
        <p className="text-sm text-muted-foreground">
          This project will be saved in this browser. Evidence uploads and audits require the cloud
          workspace.
        </p>
      ) : (
        <>
          <div>
            <Label htmlFor="f">Evidence files (source, text, logs, images, PDF — max 10MB)</Label>
            <Input
              id="f"
              type="file"
              multiple
              accept=".txt,.md,.log,.json,.csv,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.c,.cpp,.css,.html,.png,.jpg,.jpeg,.webp,.pdf"
              onChange={(e) => setFiles([...(e.target.files ?? [])])}
            />
          </div>
          <ConsentFields value={consent} onChange={setConsent} />
        </>
      )}
      <Button type="submit" variant="hero" disabled={busy}>
        {busy ? "Saving…" : "Create project"}
      </Button>
    </form>
  );
}
