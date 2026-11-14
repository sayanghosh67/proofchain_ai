# ProofChain.AI

An evidence-based project auditing application built with React 19, TanStack Start, Supabase, and the official Google Gen AI SDK.

## What works in the source

- No login screen: visitors receive isolated Supabase anonymous sessions.
- Project creation, editing, deletion with confirmation, ownership checks and consent controls.
- Weighted milestones, acceptance criteria, claimed progress, linked evidence and historical Gemini assessments.
- Private evidence uploads, SHA-256 duplicate detection, previews, deletion, and Gemini document/image analysis.
- Gemini claim extraction, structured evidence assessment, audit explanations, and project-scoped investigator conversations.
- GitHub API snapshots containing real commits, PR states, and workflow results; OAuth authorization for private repositories.
- Controlled HTTP checks with DNS pinning and private-network blocking. These are **not browser automation or comprehensive security tests**.
- Audit history, evidence graph, PDF/JSON reports, realtime updates and polling fallback.
- No automatically inserted demo projects. The old public fixture endpoint returns 404.

## Run locally

Use Node.js 22.12 or newer and npm 11.6.2 (the lockfile generator version):

```sh
npm install --global npm@11.6.2
npm ci
cp .env.example .env
# Fill .env with your Supabase project settings and server-only Gemini settings.
npm run dev
```

Never commit `.env` or place Gemini keys in variables prefixed with `VITE_`.
`GEMINI_MODEL` must name a model available to your API key. The server checks model availability before its first call. There is no mock fallback.

## Database setup

For a **new Supabase project**, run these files in the SQL editor, in order:

1. `drizzle/migrations/0000_migration.sql`
2. `drizzle/migrations/0001_project_audit_consent_and_live_updates.sql`
3. `database/002_product_workflows.sql`

For the existing Lovable database, apply only the migrations not already present. The product migration also upgrades older milestone tables and can be reapplied. Back up existing data before schema changes.
The migration creates the private `evidence` storage bucket, milestone/review/chat tables, project-parent ownership policies and an atomic per-user AI rate limiter. The generated TypeScript database bindings remain preserved; new tables have explicit application types.

In Supabase Authentication:

- **Enable Anonymous Sign-ins.** This is required for login-free guest access. Guest projects remain tied to the browser session; clearing browser storage can lose access.

- Enable Email, GitHub as desired.
- Configure provider credentials in Supabase, not in frontend code.
- Add `http://localhost:5173/auth` (or your actual dev port) and `https://YOUR_HOST/auth` to allowed redirect URLs.
- Set the production Site URL.
- GitHub's OAuth callback is the URL displayed in Supabase's GitHub provider settings. GitHub access is tied to the currently signed-in provider session; reauthorize after expiry. Tokens are not saved in application tables.

## Deploy from GitHub

This is a **Node server application**, not a GitHub Pages static website.
Use Render, Railway, a Node-capable host, or the included Dockerfile.

- Build command: `npm install --global npm@11.6.2 && npm ci && npm run build`
- Start command: `npm start`
- Node version: 22 or newer
- Configure all variables from `.env.example` in the hosting dashboard. `VITE_*` values must be available at build time; server variables must be available at runtime.
- Apply database migrations and configure authentication redirects before live use.

`render.yaml` supplies a Render Blueprint. Creating a service may incur hosting charges; no service has been provisioned by this repository upload.

## Verification

```sh
npm run typecheck
npm test
npm run lint
npm run build
```

See `IMPLEMENTATION_STATUS.md` for completed checks and live-verification limits.

## Scoring and evidence boundaries

The deterministic evidence-v1 trust score is 70% claim support plus 30% executed test pass rate; partial support earns half credit. It is unavailable when required data is absent. This preserves the existing versioned scoring rule rather than pretending all five suggested dimensions have been measured.

Milestone claimed progress is the weight-normalized average of submitted percentages. AI evidence-supported progress counts only current, verified milestone assessments, capped at the submitted claim. Unassessed milestones remain in the denominator. Changing a milestone invalidates its assessment. An AI assessment is not an independent test result, image-authenticity guarantee, fraud probability, or security certification.

Reports preserve model IDs, evidence IDs, timestamps, and assessment input snapshots. Keyword overlap never verifies a claim. Missing evidence is not proof of deception.

## Operational limits

Audits run within authenticated server requests; very long audits need a background job queue for larger deployments. Apply API/egress limits at the hosting layer in addition to the database AI limit. Live acceptance tests with two user accounts are required before production release. Historical audit snapshots retain evidence content after file deletion; deleting the project removes its associated records.
