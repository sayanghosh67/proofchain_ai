import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/tests")({
  head: () => ({
    meta: [
      { title: "Website testing — ProofChain.AI" },
      { name: "description", content: "Website testing for your ProofChain.AI project." },
      { property: "og:title", content: "Website testing — ProofChain.AI" },
      { property: "og:description", content: "Website testing for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="tests" />;
}
