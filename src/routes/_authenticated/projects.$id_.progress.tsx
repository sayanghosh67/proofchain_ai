import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/progress")({
  head: () => ({
    meta: [
      { title: "Fake-progress detection — ProofChain.AI" },
      { name: "description", content: "Fake-progress detection for your ProofChain.AI project." },
      { property: "og:title", content: "Fake-progress detection — ProofChain.AI" },
      {
        property: "og:description",
        content: "Fake-progress detection for your ProofChain.AI project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="progress" />;
}
