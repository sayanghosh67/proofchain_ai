import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/readiness")({
  head: () => ({
    meta: [
      { title: "Release readiness — ProofChain.AI" },
      { name: "description", content: "Release readiness for your ProofChain.AI project." },
      { property: "og:title", content: "Release readiness — ProofChain.AI" },
      { property: "og:description", content: "Release readiness for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="readiness" />;
}
