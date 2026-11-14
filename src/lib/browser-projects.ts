type BrowserProjectFields = {
  name: string;
  description: string;
  requirements: string;
  progress_report: string;
  website_url: string;
  github_url: string;
};

const storageKey = "proofchain.browser-projects.v1";

export function readBrowserProjects(): (BrowserProjectFields & { id: string })[] {
  return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
}

export function saveBrowserProject(fields: BrowserProjectFields) {
  const project = { ...fields, name: fields.name.trim(), id: crypto.randomUUID() };
  if (!project.name) throw new Error("Enter a project name.");
  localStorage.setItem(storageKey, JSON.stringify([project, ...readBrowserProjects()]));
  return project.id;
}
