import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateProject, deleteProject } from "@/lib/product.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectData } from "./data";
export function ProjectManager({ d }: { d: ProjectData }) {
  const save = useServerFn(updateProject),
    remove = useServerFn(deleteProject);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState("");
  const [values, setValues] = useState({
    name: d.project.name,
    description: d.project.description,
    requirements: d.project.requirements,
    progress_report: d.project.progress_report,
    website_url: d.project.website_url ?? "",
    github_url: d.project.github_url ?? "",
  });
  return (
    <details className="glass p-5">
      <summary className="cursor-pointer font-semibold">Edit project & settings</summary>
      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save({ data: { projectId: d.project.id, ...values } });
            await qc.invalidateQueries({ queryKey: ["project", d.project.id] });
            await qc.invalidateQueries({ queryKey: ["dashboard"] });
            toast.success("Project updated");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {Object.entries(values).map(([key, value]) => (
          <label className="space-y-2 text-sm" key={key}>
            <span className="capitalize">{key.replaceAll("_", " ")}</span>
            {["description", "requirements", "progress_report"].includes(key) ? (
              <Textarea
                value={value}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              />
            ) : (
              <Input
                required={key === "name"}
                value={value}
                type={key.endsWith("url") ? "url" : "text"}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <Button disabled={busy} type="submit">
          {busy ? "Saving…" : "Save project"}
        </Button>
      </form>
      <details className="mt-6 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm text-destructive">Delete project</summary>
        <p className="my-3 text-sm text-muted-foreground">
          Permanently deletes the project, uploaded files, and all audit history. Type “
          {d.project.name}” to confirm.
        </p>
        <Input
          aria-label="Project name to confirm deletion"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <Button
          className="mt-3"
          variant="destructive"
          disabled={busy || confirmation !== d.project.name}
          onClick={async () => {
            setBusy(true);
            try {
              await remove({ data: { projectId: d.project.id, confirmation } });
              await qc.invalidateQueries();
              await nav({ to: "/dashboard" });
            } catch (e) {
              toast.error((e as Error).message);
              setBusy(false);
            }
          }}
        >
          Delete permanently
        </Button>
      </details>
    </details>
  );
}
