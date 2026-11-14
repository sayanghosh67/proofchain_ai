import { z } from "zod";
import { assertAuthorized, TEST_TYPES, type TestType } from "./http-tests";

export const BrowserResult = z.object({
  test_type: z.enum(TEST_TYPES as [TestType, ...TestType[]]),
  target: z.string().url(),
  passed: z.boolean(),
  details: z.string().max(2000),
  logs: z.array(z.string().max(2000)).max(60),
  page: z.object({
    url: z.string().url(),
    title: z.string().max(300),
    text: z.string().max(12000),
    viewport: z.object({
      width: z.number().int().positive().max(4096),
      height: z.number().int().positive().max(4096),
    }),
  }),
  screenshot: z
    .string()
    .min(20)
    .max(1_500_000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export async function callBrowserWorker(
  type: TestType,
  target: string,
  options: {
    url?: string | undefined;
    secret?: string | undefined;
    authorizedHosts: string[];
    selfOrigin?: string | undefined;
    apiPath?: string | undefined;
    login?: { path: string; user: string; pass: string } | undefined;
  },
  fetcher: typeof fetch = fetch,
) {
  if (!options.url || !options.secret)
    throw new Error(
      "Real-browser testing is not connected. Deploy the separate browser worker and configure its URL and shared secret. No HTTP fallback was run.",
    );
  const endpoint = new URL(options.url);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password)
    throw new Error("Browser worker must use a secure HTTPS URL");
  assertAuthorized(target, options.authorizedHosts, options.selfOrigin);
  let response: Response;
  try {
    response = await fetcher(new URL("/run", endpoint), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(50_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${options.secret}` },
      body: JSON.stringify({
        test_type: type,
        target,
        apiPath: options.apiPath,
        login: options.login,
      }),
    });
  } catch {
    throw new Error(
      "The browser worker could not complete this check. No result or verdict was recorded.",
    );
  }
  if (!response.ok)
    throw new Error(
      `Browser worker unavailable (${response.status}). No test verdict was recorded.`,
    );
  if (Number(response.headers.get("content-length") ?? 0) > 2_000_000)
    throw new Error("Browser evidence exceeded the response budget");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Browser worker returned no evidence");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2_000_000) {
      await reader.cancel();
      throw new Error("Browser evidence exceeded the response budget");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const result = BrowserResult.parse(JSON.parse(new TextDecoder().decode(bytes)));
  if (result.target !== target || result.test_type !== type)
    throw new Error("Browser worker returned mismatched test evidence");
  assertAuthorized(result.page.url, options.authorizedHosts, options.selfOrigin);
  return result;
}
