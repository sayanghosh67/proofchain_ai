import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/agents")({
  head: () => ({
    meta: [
      { title: "Multi-agent audit — ProofChain.AI" },
      { name: "description", content: "Multi-agent audit for your ProofChain.AI project." },
      { property: "og:title", content: "Multi-agent audit — ProofChain.AI" },
      { property: "og:description", content: "Multi-agent audit for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="agents" />;
}
