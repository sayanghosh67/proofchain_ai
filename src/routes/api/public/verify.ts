import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { safeHttp } from "@/lib/engine/safe-http.server";
import { githubSnapshot } from "@/lib/engine/github";

const input = z.object({
  website: z.string().max(500),
  repository: z.string().max(300),
});
let windowStarted = 0;
let requests = 0;
let active = 0;

export const Route = createFileRoute("/api/public/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (
          request.headers.get("sec-fetch-site") !== "same-origin" &&
          request.headers.get("origin") !== new URL(request.url).origin
        ) {
          return Response.json(
            { error: "Open the project page to run verification." },
            { status: 403 },
          );
        }
        if (Date.now() - windowStarted >= 60_000) {
          windowStarted = Date.now();
          requests = 0;
        }
        if (active >= 3 || requests >= 20) {
          return Response.json(
            { error: "Verification is busy. Try again in a minute." },
            { status: 429 },
          );
        }
        requests++;
        active++;
        try {
          const reader = request.body?.getReader();
          if (!reader)
            return Response.json({ error: "Enter a verification target." }, { status: 400 });
          const decoder = new TextDecoder();
          let body = "";
          let bytes = 0;
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (bytes > 4096) {
              await reader.cancel();
              return Response.json({ error: "Request is too large." }, { status: 413 });
            }
            body += decoder.decode(chunk.value, { stream: true });
          }
          const { website, repository } = input.parse(JSON.parse(body));
          const checks = [];
          const target = website ? new URL(website) : null;
          const repo = repository
            .trim()
            .replace(/^URL\s+/i, "")
            .match(/^https:\/\/github\.com\/([\w-]+)\/([\w.-]+)\/?$/i);
          if (
            target &&
            (!["https:", "http:"].includes(target.protocol) ||
              target.port ||
              target.username ||
              target.password)
          ) {
            return Response.json(
              {
                error: "Use a public HTTP or HTTPS website URL with no credentials or custom port.",
              },
              { status: 400 },
            );
          }
          if (repository && (!repo || [".", ".."].includes(repo[2]!))) {
            return Response.json(
              {
                error:
                  "Use a public GitHub repository URL in the form https://github.com/owner/repo.",
              },
              { status: 400 },
            );
          }
          if (!target && !repo)
            return Response.json(
              { error: "Add a website URL or public GitHub repository." },
              { status: 400 },
            );

          if (target) {
            try {
              const response = await safeHttp(target.href, { method: "GET" }, 8000);
              checks.push({
                name: "Website response",
                status: response.status >= 200 && response.status < 300 ? "passed" : "attention",
                detail: `HTTP ${response.status} in ${response.ms} ms. This check measures the URL response, without testing page interactions.`,
              });
              for (const [header, label] of [
                ["content-security-policy", "Content Security Policy"],
                ["strict-transport-security", "Strict Transport Security"],
                ["x-content-type-options", "Content type protection"],
              ] as const) {
                if (header === "strict-transport-security" && target.protocol !== "https:")
                  continue;
                const present = response.headers.has(header);
                checks.push({
                  name: label,
                  status: present ? "passed" : "attention",
                  detail: present
                    ? "Header present in the response."
                    : "Header missing. Review whether this protection applies to the site.",
                });
              }
            } catch {
              checks.push({
                name: "Website response",
                status: "unavailable",
                detail:
                  "The website could not be checked. The target must resolve to a public address and respond within the request limits.",
              });
            }
          }
          if (repo) {
            try {
              const snapshot = await githubSnapshot(repo[1]!, repo[2]!);
              checks.push({
                name: "GitHub repository",
                status: "passed",
                detail: `${snapshot.full_name} · ${snapshot.default_branch} · ${snapshot.commits.length} recent commits · ${snapshot.pull_requests.length} recent pull requests`,
              });
              const latest = snapshot.commits[0];
              if (latest)
                checks.push({
                  name: "Latest commit",
                  status: "observed",
                  detail: `${latest.sha.slice(0, 12)} · ${latest.date ?? "Date unavailable"} · ${String(latest.message).slice(0, 280)}`,
                });
              const workflows = Array.isArray(snapshot.workflows) ? snapshot.workflows : [];
              const current = latest ? workflows.filter((run) => run.head_sha === latest.sha) : [];
              checks.push({
                name: "GitHub Actions",
                status: "observed",
                detail: current.length
                  ? current
                      .map((w) => `${w.name}: ${w.conclusion ?? w.status}`)
                      .join("; ")
                      .slice(0, 1000)
                  : "No visible workflow runs for the latest commit in the retrieved results.",
              });
            } catch {
              checks.push({
                name: "GitHub repository",
                status: "unavailable",
                detail:
                  "GitHub did not return repository evidence. Check the public URL or retry after the API limit resets.",
              });
            }
          }
          return Response.json({ checkedAt: new Date().toISOString(), checks });
        } catch {
          return Response.json(
            { error: "Enter valid public website and GitHub repository URLs." },
            { status: 400 },
          );
        } finally {
          active--;
        }
      },
    },
  },
});
