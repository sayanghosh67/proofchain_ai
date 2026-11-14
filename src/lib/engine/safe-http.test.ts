import { expect, it } from "vitest";
import { publicAddress } from "./safe-http.server";
it("blocks internal, reserved and IPv4-mapped IPv6 networks", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "fd00::1",
    "224.0.0.1",
  ])
    expect(publicAddress(ip), ip).toBe(false);
  expect(publicAddress("8.8.8.8")).toBe(true);
  expect(publicAddress("2606:4700:4700::1111")).toBe(true);
});
