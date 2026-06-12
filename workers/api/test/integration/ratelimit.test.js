import { describe, it, expect, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import { checkRateLimit } from "../../src/middleware/ratelimit.js";

describe("checkRateLimit", () => {
  beforeAll(async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS submissions_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ).run();
  });

  it("allows first submission (empty log)", async () => {
    const result = await checkRateLimit(env, "empty-ip-hash", "submission");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it("allows up to 3 submissions", async () => {
    const ip = "rate-test-ip";
    // Insert 2 existing submissions
    for (let i = 0; i < 2; i++) {
      await env.DB.prepare(
        "INSERT INTO submissions_log (ip_hash, created_at) VALUES (?1, datetime('now'))",
      )
        .bind(ip)
        .run();
    }
    // 2 existing — should still be allowed (2 < 3)
    const result = await checkRateLimit(env, ip, "submission");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("rejects 4th submission within window", async () => {
    const ip = "rate-test-ip-2";
    // Insert 3 submissions
    for (let i = 0; i < 3; i++) {
      await env.DB.prepare(
        "INSERT INTO submissions_log (ip_hash, created_at) VALUES (?1, datetime('now'))",
      )
        .bind(ip)
        .run();
    }
    // 3 existing — should be rejected (3 < 3 is false)
    const result = await checkRateLimit(env, ip, "submission");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
