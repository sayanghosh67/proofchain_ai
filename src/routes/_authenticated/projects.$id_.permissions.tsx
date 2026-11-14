import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/permissions")({
  head: () => ({
    meta: [
      { title: "Organization & permissions — ProofChain.AI" },
      {
        name: "description",
        content: "Organization & permissions for your ProofChain.AI project.",
      },
      { property: "og:title", content: "Organization & permissions — ProofChain.AI" },
      {
        property: "og:description",
        content: "Organization & permissions for your ProofChain.AI project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="permissions" />;
}
