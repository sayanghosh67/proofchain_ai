import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/reports")({
  head: () => ({
    meta: [
      { title: "Audit reports — ProofChain.AI" },
      { name: "description", content: "Audit reports for your ProofChain.AI project." },
      { property: "og:title", content: "Audit reports — ProofChain.AI" },
      { property: "og:description", content: "Audit reports for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="reports" />;
}
