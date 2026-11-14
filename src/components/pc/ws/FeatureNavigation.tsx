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
          <Link to={f.to} params={{ id }} aria-current={active === f.key ? "page" : undefined}>
            <f.icon className="mr-1 size-3.5 shrink-0" />
            {f.title}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

export function FeatureGrid({ id }: { id: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {FEATURES.map((f, i) => (
        <article
          key={f.key}
          className="flex min-w-0 flex-col items-start gap-4 rounded-lg border border-border bg-card/60 p-5"
        >
          <div className="flex w-full items-center justify-between">
            <f.icon className="size-5 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
          <h3 className="min-h-10 text-sm font-semibold">{f.title}</h3>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-auto h-auto min-h-8 max-w-full whitespace-normal"
          >
            <Link to={f.to} params={{ id }}>
              {f.action}
              <ArrowUpRight className="ml-2 size-4 shrink-0" />
            </Link>
          </Button>
        </article>
      ))}
    </div>
  );
}
