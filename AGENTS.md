# ProofChain.AI development guidance

The repository preserves the original React/TanStack Start/Supabase application.
The user requested direct Google Gemini integration and deployment independent of Lovable.

- Use the official Google Gen AI SDK through `src/lib/engine/gemini.ts` on the server.
- Never expose or commit Gemini keys, provider tokens, `.env`, or service-role keys.
- Keep tests, deterministic verdicts, and AI assessments clearly distinguished.
- Do not seed demo projects, fabricate evidence, or substitute fake AI responses.
- Require project ownership and explicit consent before external analysis or testing.
- Use `database/002_product_workflows.sql` for the product schema extension; preserve generated integration bindings.
- Keep `.env.example`, README setup instructions, and implementation status accurate.
- `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` must pass before publishing changes.
- Never rewrite published Git history or force-push.
