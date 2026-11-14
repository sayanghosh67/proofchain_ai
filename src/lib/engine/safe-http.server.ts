import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";
export function publicAddress(address: string) {
  if (isIP(address) === 6) return /^2[0-9a-f]{3}:/i.test(address); // Global unicast only; blocks mapped IPv4 and local ranges.
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return (
    a !== 0 &&
    a !== 10 &&
    a !== 127 &&
    a! < 224 &&
    !(a === 169 && b === 254) &&
    !(a === 172 && b! >= 16 && b! <= 31) &&
    !(a === 192 && [0, 168].includes(b!)) &&
    !(a === 100 && b! >= 64 && b! <= 127) &&
    !(a === 198 && [18, 19].includes(b!))
  );
}
export async function safeHttp(url: string, init: RequestInit, timeout: number) {
  const u = new URL(url);
  const hostname = u.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("Private/internal network targets are blocked");
  const selected = addresses[0]!;
  const started = Date.now();
  return new Promise<{ status: number; body: string; ms: number; headers: Headers }>(
    (resolve, reject) => {
      // Pin DNS for the actual connection, preventing DNS rebinding between validation and fetch.
      const request = (u.protocol === "https:" ? httpsRequest : httpRequest)(
        u,
        {
          method: init.method ?? "GET",
          headers: Object.fromEntries(new Headers(init.headers).entries()),
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, [selected]);
            else callback(null, selected.address, selected.family);
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 400000) request.destroy(new Error("Response exceeded 400KB limit"));
            else chunks.push(chunk);
          });
          response.on("error", reject);
          response.on("end", () => {
            const headers = new Headers();
            for (const [key, value] of Object.entries(response.headers))
              if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
            resolve({
              status: response.statusCode ?? 0,
              body: Buffer.concat(chunks).toString("utf8"),
              ms: Date.now() - started,
              headers,
            });
          });
        },
      );
      const timer = setTimeout(() => request.destroy(new Error("HTTP check timed out")), timeout);
      request.on("close", () => clearTimeout(timer));
      request.on("error", reject);
      if (typeof init.body === "string") request.write(init.body);
      request.end();
    },
  );
}
