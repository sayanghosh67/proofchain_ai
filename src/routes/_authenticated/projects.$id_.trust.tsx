import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/trust")({
  head: () => ({
    meta: [
      { title: "Evidence trust score — ProofChain.AI" },
      { name: "description", content: "Evidence trust score for your ProofChain.AI project." },
      { property: "og:title", content: "Evidence trust score — ProofChain.AI" },
      {
        property: "og:description",
        content: "Evidence trust score for your ProofChain.AI project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="trust" />;
}
