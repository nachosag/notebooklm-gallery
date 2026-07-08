import { describe, it, expect, beforeAll } from "vitest";
import { env, createExecutionContext } from "cloudflare:test";
import { checkRateLimit } from "../../src/middleware/ratelimit.js";
import { handleLike } from "../../src/handlers/likes.js";
import { hashIp } from "../../src/utils/ip.js";

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

describe("handleLike rate limit — 30 like actions / hour (drift #3)", () => {
  beforeAll(async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY,
        likes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ).run();
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS likes_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notebook_id TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ).run();
    await env.DB.prepare("DELETE FROM likes_log").run();
    await env.DB.prepare("DELETE FROM notebooks").run();
    await env.DB.prepare(
      "INSERT INTO notebooks (id, likes) VALUES ('rate-nb', 0)",
    ).run();
  });

  function likeRequest(ip) {
    return new Request("https://example.com/api/notebooks/rate-nb/like", {
      method: "POST",
      headers: { "CF-Connecting-IP": ip },
    });
  }

  async function seedActions(ipHash, count) {
    for (let i = 0; i < count; i++) {
      await env.DB.prepare(
        "INSERT INTO likes_log (notebook_id, ip_hash, created_at) VALUES ('rate-nb', ?1, datetime('now'))",
      )
        .bind(ipHash)
        .run();
    }
  }

  it("returns 429 once the IP has performed 30 like actions in the last hour", async () => {
    const ip = "30.0.0.30";
    const ipHash = await hashIp(ip);
    // 30 existing actions -> at limit (30 >= 30) -> MUST be rejected.
    await seedActions(ipHash, 30);
    const ctx = createExecutionContext();
    const res = await handleLike(likeRequest(ip), env, "rate-nb");
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("still allows the 30th action when 29 are recorded (under limit)", async () => {
    const ip = "29.0.0.29";
    const ipHash = await hashIp(ip);
    // 29 existing -> under limit -> next action MUST succeed (not 429).
    await seedActions(ipHash, 29);
    const ctx = createExecutionContext();
    const res = await handleLike(likeRequest(ip), env, "rate-nb");
    expect(res.status).not.toBe(429);
    expect(res.status).toBe(200);
  });
});
