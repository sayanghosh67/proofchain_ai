import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/github")({
  head: () => ({
    meta: [
      { title: "GitHub integration — ProofChain.AI" },
      { name: "description", content: "GitHub integration for your ProofChain.AI project." },
      { property: "og:title", content: "GitHub integration — ProofChain.AI" },
      { property: "og:description", content: "GitHub integration for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="github" />;
}
