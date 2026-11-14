import { describe, expect, it, vi } from "vitest";
import { callBrowserWorker } from "./browser-worker";

const target = "https://demo.example/api/public/demo/site";
const options = {
  url: "https://worker.example",
  secret: "test-only-placeholder",
  authorizedHosts: ["demo.example"],
};
const result = {
  test_type: "availability",
  target,
  passed: true,
  details: "Chromium rendered dashboard",
  logs: ["ENGINE: Chromium"],
  page: {
    url: target,
    title: "Dashboard",
    text: "Dashboard content",
    viewport: { width: 1280, height: 900 },
  },
  screenshot: "aGVsbG9oZWxsb2hlbGxvaGVsbG8=",
};

describe("Separate browser transport", () => {
  it("does not run HTTP checks when the browser worker is unconfigured", async () => {
    const fetcher = vi.fn();
    await expect(
      callBrowserWorker(
        "availability",
        target,
        { authorizedHosts: options.authorizedHosts },
        fetcher,
      ),
    ).rejects.toThrow("No HTTP fallback");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not turn worker failure into a contradicted claim", async () => {
    await expect(
      callBrowserWorker(
        "availability",
        target,
        options,
        vi.fn().mockResolvedValue(new Response("", { status: 503 })),
      ),
    ).rejects.toThrow("No test verdict");
  });
  it("rejects mismatched returned test evidence", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ ...result, test_type: "login_flow" }));
    await expect(callBrowserWorker("availability", target, options, fetcher)).rejects.toThrow(
      "mismatched",
    );
  });
  it("returns actual rendered page evidence from the authenticated worker", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result));
    const out = await callBrowserWorker("availability", target, options, fetcher);
    expect(out.page.text).toBe("Dashboard content");
    expect(fetcher.mock.calls[0]?.[1]?.headers.authorization).toBe("Bearer test-only-placeholder");
  });
});
