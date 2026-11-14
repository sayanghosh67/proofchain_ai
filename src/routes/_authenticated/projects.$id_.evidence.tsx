import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence vault — ProofChain.AI" },
      { name: "description", content: "Evidence vault for your ProofChain.AI project." },
      { property: "og:title", content: "Evidence vault — ProofChain.AI" },
      { property: "og:description", content: "Evidence vault for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="evidence" />;
}
