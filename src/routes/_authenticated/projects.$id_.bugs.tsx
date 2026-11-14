import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/bugs")({
  head: () => ({
    meta: [
      { title: "Bug intelligence — ProofChain.AI" },
      { name: "description", content: "Bug intelligence for your ProofChain.AI project." },
      { property: "og:title", content: "Bug intelligence — ProofChain.AI" },
      { property: "og:description", content: "Bug intelligence for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="bugs" />;
}
