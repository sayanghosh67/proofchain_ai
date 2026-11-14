import { createFileRoute } from "@tanstack/react-router";
// Legacy fixture URL is intentionally disabled in the real product.
export const Route = createFileRoute("/api/public/demo/$")({
  server: {
    handlers: {
      GET: () => new Response("Not found", { status: 404 }),
      POST: () => new Response("Not found", { status: 404 }),
    },
  },
});
