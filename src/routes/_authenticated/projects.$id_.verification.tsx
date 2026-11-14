import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/verification")({
  head: () => ({
    meta: [
      { title: "Live verification — ProofChain.AI" },
      { name: "description", content: "Live verification for your ProofChain.AI project." },
      { property: "og:title", content: "Live verification — ProofChain.AI" },
      { property: "og:description", content: "Live verification for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="verification" />;
}
