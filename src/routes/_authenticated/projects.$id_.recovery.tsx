import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/recovery")({
  head: () => ({
    meta: [
      { title: "Self-healing & recovery — ProofChain.AI" },
      { name: "description", content: "Self-healing & recovery for your ProofChain.AI project." },
      { property: "og:title", content: "Self-healing & recovery — ProofChain.AI" },
      {
        property: "og:description",
        content: "Self-healing & recovery for your ProofChain.AI project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="recovery" />;
}
