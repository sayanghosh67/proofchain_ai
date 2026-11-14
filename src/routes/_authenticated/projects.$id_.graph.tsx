import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/graph")({
  head: () => ({
    meta: [
      { title: "Evidence graph — ProofChain.AI" },
      { name: "description", content: "Evidence graph for your ProofChain.AI project." },
      { property: "og:title", content: "Evidence graph — ProofChain.AI" },
      { property: "og:description", content: "Evidence graph for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="graph" />;
}
