/* eslint-disable @typescript-eslint/no-explicit-any */
export async function githubSnapshot(owner: string, repo: string, token?: string) {
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "ProofChain.AI",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers["authorization"] = `Bearer ${token}`;
  async function get(path: string, optional = false) {
    const response = await fetch(base + path, {
      headers,
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) {
      if (optional && [403, 404].includes(response.status))
        return { unavailable: `GitHub ${response.status}: access unavailable` };
      throw new Error(`GitHub ${response.status}. Check repository access and token permissions.`);
    }
    return response.json();
  }
  const [metadata, commits, pulls, workflows, contents] = await Promise.all([
    get(""),
    get("/commits?per_page=20"),
    get("/pulls?state=all&per_page=20"),
    get("/actions/runs?per_page=20", true),
    get("/contents", true),
  ]);
  const files = Array.isArray(contents)
    ? contents
        .slice(0, 60)
        .map(
          (f: { type: string; name: string }) =>
            `${f.type === "dir" ? "Directory" : "File"}: ${f.name}`,
        )
    : [];
  return {
    full_name: metadata.full_name,
    description: metadata.description,
    language: metadata.language,
    stars: metadata.stargazers_count,
    pushed_at: metadata.pushed_at,
    default_branch: metadata.default_branch,
    files,
    fetched_at: new Date().toISOString(),
    commits: commits.map((c: any) => ({
      sha: c.sha,
      message: c.commit.message,
      date: c.commit.committer?.date,
      url: c.html_url,
    })),
    pull_requests: pulls.map((p: any) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      merged_at: p.merged_at,
      head_sha: p.head.sha,
      url: p.html_url,
    })),
    workflows:
      workflows.workflow_runs?.map((w: any) => ({
        id: w.id,
        name: w.name,
        status: w.status,
        conclusion: w.conclusion,
        head_sha: w.head_sha,
        url: w.html_url,
      })) ?? workflows,
  };
}
