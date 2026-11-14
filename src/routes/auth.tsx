import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ProofChain.AI" },
      { name: "description", content: "Sign in to run AI audits on your projects." },
      { property: "og:title", content: "Sign in — ProofChain.AI" },
      { property: "og:description", content: "Sign in to run AI audits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const G = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Full-page OAuth returns here with its session already established. The
  // public callback must resume navigation rather than show sign-in again.
  useEffect(() => {
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (active && !error && data.user) void nav({ to: "/dashboard", replace: true });
      })
      .catch(() => {
        /* Signed-out visitors can still use the form. */
      });
    return () => {
      active = false;
    };
  }, [nav]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin + "/dashboard" },
          });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "up" && !data.session) {
      toast.success("Check your email to confirm your account.");
      return;
    }
    nav({ to: "/dashboard" });
  };
  const oauth = async (provider: "google" | "github") => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + "/auth",
          ...(provider === "github" ? { scopes: "repo" } : {}),
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="auth-frame w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold">
          Proof<span className="text-gradient">Chain</span>.AI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "in" ? "Sign in to your audits" : "Create your account"}
        </p>
        <div className="mt-6 space-y-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => oauth("google")}
            className="h-10 w-full"
          >
            <G />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="w-full"
            onClick={() => oauth("github")}
          >
            Continue with GitHub
          </Button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        <Button
          variant="ghost"
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </Button>
      </div>
    </div>
  );
}
