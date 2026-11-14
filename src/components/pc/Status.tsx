import { cn } from "@/lib/utils";

const MAP: Record<string, [string, string]> = {
  verified: ["Verified within tested scope", "bg-success/15 text-success border-success/30"],
  partially_verified: ["Partially verified", "bg-accent/15 text-accent border-accent/30"],
  unsupported: ["Unsupported", "bg-warning/15 text-warning border-warning/30"],
  contradicted: ["Contradicted", "bg-destructive/15 text-destructive border-destructive/30"],
  not_tested: ["Not tested", "bg-muted text-muted-foreground border-border"],
  pass: ["Pass", "bg-success/15 text-success border-success/30"],
  fail: ["Fail", "bg-destructive/15 text-destructive border-destructive/30"],
  critical: ["Critical", "bg-destructive/20 text-destructive border-destructive/40"],
  high: ["High", "bg-destructive/15 text-destructive border-destructive/30"],
  medium: ["Medium", "bg-warning/15 text-warning border-warning/30"],
  low: ["Low", "bg-muted text-muted-foreground border-border"],
  GO: ["GO", "bg-success/15 text-success border-success/30"],
  "CONDITIONAL GO": ["CONDITIONAL GO", "bg-warning/15 text-warning border-warning/30"],
  "NO-GO": ["NO-GO", "bg-destructive/15 text-destructive border-destructive/30"],
  UNKNOWN: ["UNKNOWN", "bg-muted text-muted-foreground border-border"],
  open: ["Open", "bg-destructive/10 text-destructive border-destructive/30"],
  resolved: ["Resolved", "bg-success/15 text-success border-success/30"],
};

export function Status({ value, className }: { value: string; className?: string }) {
  const [label, cls] = MAP[value] ?? [value, "bg-muted text-muted-foreground border-border"];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        cls,
        className,
      )}
    >
      {label}
    </span>
  );
}
