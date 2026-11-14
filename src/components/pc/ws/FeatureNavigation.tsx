import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES, type FeatureKey } from "./features";

export function FeatureNavigation({ id, active }: { id: string; active?: FeatureKey }) {
  return (
    <nav aria-label="Project features" className="flex flex-wrap gap-2 border-y border-border py-4">
      <Button asChild variant="outline" size="sm">
        <Link to="/projects/$id" params={{ id }}>
          Overview
        </Link>
      </Button>
      {FEATURES.map((f) => (
        <Button
          key={f.key}
          asChild
          variant={active === f.key ? "default" : "ghost"}
          size="sm"
          className="h-auto min-h-8 whitespace-normal text-left"
        >
          <Link
            to={f.to}
            params={{ id }}
            hash={f.key === "management" || f.key === "investigator" ? f.key : ""}
            aria-current={active === f.key ? "page" : undefined}
          >
            <f.icon className="mr-1 size-3.5 shrink-0" />
            {f.title}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

export function FeatureGrid({ id, browser = false }: { id?: string; browser?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {FEATURES.map((feature) => {
        const publicCheck = ["github", "tests", "verification"].includes(feature.key);
        const overviewSection = feature.key === "management" || feature.key === "investigator";
        const available = id && (!browser || publicCheck || feature.key === "management");
        const hash = browser
          ? publicCheck
            ? "project-verification"
            : undefined
          : overviewSection
            ? feature.key
            : undefined;
        return (
          <article
            key={feature.key}
            className="flex min-w-0 flex-col items-start gap-3 rounded-lg border border-border bg-card/60 p-5"
          >
            <feature.icon aria-hidden="true" className="size-5 text-primary" />
            <h3 className="text-sm font-semibold">{feature.title}</h3>
            {available ? (
              <Button asChild variant="outline" size="sm" className="mt-auto">
                <Link to={browser ? "/projects/$id" : feature.to} params={{ id }} hash={hash ?? ""}>
                  {browser ? (publicCheck ? "Run verification" : "View project") : feature.action}
                  <ArrowUpRight className="ml-2 size-4 shrink-0" />
                </Link>
              </Button>
            ) : (
              <p className="mt-auto text-xs text-muted-foreground">
                {browser && !publicCheck && feature.key !== "management"
                  ? "Requires cloud workspace"
                  : "Select or create a project"}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
