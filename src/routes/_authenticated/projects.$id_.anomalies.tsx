import { createFileRoute } from "@tanstack/react-router";
import { FeaturePage } from "@/components/pc/ws/FeaturePage";

export const Route = createFileRoute("/_authenticated/projects/$id_/anomalies")({
  head: () => ({
    meta: [
      { title: "Anomaly detection — ProofChain.AI" },
      { name: "description", content: "Anomaly detection for your ProofChain.AI project." },
      { property: "og:title", content: "Anomaly detection — ProofChain.AI" },
      { property: "og:description", content: "Anomaly detection for your ProofChain.AI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <FeaturePage id={id} feature="anomalies" />;
}
