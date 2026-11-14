import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/accuracy")({
  head: () => ({
    meta: [
      { title: "AI accuracy scope — ProofChain.AI" },
      { name: "description", content: "AI accuracy scope for your ProofChain.AI project." },
      { property: "og:title", content: "AI accuracy scope — ProofChain.AI" },
      { property: "og:description", content: "AI accuracy scope for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="accuracy" />;
}
