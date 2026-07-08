import { describe, it, expect } from "vitest";
import { hashIp } from "../../src/utils/ip.js";

describe("hashIp", () => {
  it("produces deterministic hash for same IP", async () => {
    const hash1 = await hashIp("192.168.1.1");
    const hash2 = await hashIp("192.168.1.1");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different IPs", async () => {
    const hash1 = await hashIp("192.168.1.1");
    const hash2 = await hashIp("10.0.0.1");
    expect(hash1).not.toBe(hash2);
  });

  it("returns 64-character lowercase hex string", async () => {
    const hash = await hashIp("192.168.1.1");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles empty string without crashing", async () => {
    const hash = await hashIp("");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  // Drift #2 pin: the tested implementation hashes the BARE IP (no salt),
  // i.e. hashIp(x) === sha256(x). The production _worker.js salts with
  // "notebooklm-gallery-salt"; this test locks the tested winner in place.
  it("equals the bare SHA-256 of the input (no salt) — drift #2", async () => {
    // sha256("x") computed independently:
    //   2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881
    const expected = "2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881";
    const result = await hashIp("x");
    expect(result).toBe(expected);
    // Triangulate: confirm it is NOT the salted variant production uses.
    const { createHash } = await import("node:crypto");
    const salted = createHash("sha256")
      .update("x" + "notebooklm-gallery-salt")
      .digest("hex");
    expect(result).not.toBe(salted);
  });
});
