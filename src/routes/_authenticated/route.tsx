import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, FolderPlus, LogOut, Menu, Link2, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };
  const items = [
    { to: "/dashboard", label: "Mission Control", icon: LayoutDashboard },
    { to: "/projects/new", label: "New Project", icon: FolderPlus },
  ] as const;
  return (
    <div className="workspace-shell flex min-h-screen">
      <aside
        className={cn(
          "workspace-sidebar fixed inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-4 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 px-2 py-3 text-base font-semibold">
            <span className="brand-mark">
              <Link2 className="size-4" />
            </span>
            ProofChain<span className="text-muted-foreground">.AI</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </div>
        <p className="mt-8 px-3 font-mono text-[9px] text-primary">01 / WORKSPACE</p>
        <nav className="mt-6 space-y-1">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent",
                path === i.to && "bg-sidebar-accent text-primary",
              )}
            >
              <i.icon className="h-4 w-4" />
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-4 bottom-4">
          <p className="truncate px-3 text-xs text-muted-foreground">{user.email}</p>
          <Button variant="ghost" onClick={signOut} className="mt-2 w-full justify-start gap-3">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/70 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="min-w-0 flex-1">
        <div className="workspace-topbar flex h-16 items-center justify-between gap-3 border-b border-border px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <span className="text-xs text-muted-foreground">
              Workspace <span className="mx-2 text-border">/</span>
              <span className="text-foreground">
                {path === "/dashboard"
                  ? "Mission Control"
                  : path === "/projects/new"
                    ? "New Project"
                    : "Project audit"}
              </span>
            </span>
          </div>
          <span className="hidden items-center gap-2 font-mono text-[9px] text-muted-foreground sm:flex">
            <ShieldCheck className="size-3 text-primary" /> EVIDENCE FIRST
          </span>
        </div>
        <div className="workspace-content mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
