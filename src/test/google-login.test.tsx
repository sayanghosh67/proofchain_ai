import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  nav: vi.fn(),
  getUser: vi.fn(),
  oauth: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => mocks.nav,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: mocks.getUser, signInWithOAuth: mocks.oauth } },
}));
vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: mocks.oauth } },
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));

import { Route } from "@/routes/auth";
const AuthPage = Route.options.component as () => React.ReactNode;

describe("Google sign-in return", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });
  afterEach(cleanup);

  it("takes a confirmed OAuth return session to /dashboard", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "google-user" } }, error: null });
    render(<AuthPage />);
    await waitFor(() =>
      expect(mocks.nav).toHaveBeenCalledWith({ to: "/dashboard", replace: true }),
    );
  });

  it("keeps an incomplete Google session out of the dashboard", async () => {
    mocks.oauth.mockResolvedValue({ error: new Error("Provider unavailable") });
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.nav).not.toHaveBeenCalled();
    expect(mocks.oauth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
  });

  it("handles popup rejection without leaving sign-in stuck", async () => {
    mocks.oauth.mockRejectedValue(new Error("Popup blocked"));
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Popup blocked"));
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });
});
