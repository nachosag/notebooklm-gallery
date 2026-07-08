import { describe, it, expect, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import { handleList } from "../../src/handlers/notebooks.js";

// Drift #7 pin: the category filter MUST return only notebooks whose
// `categories` JSON array contains the requested slug. The tested list
// handler builds the LIKE pattern in SQL (search path uses D1 `||`
// concatenation; the non-search path binds the pattern from JS). This
// test pins the BEHAVIORAL outcome (correct filtered results), not the
// SQL form, per the implementation-detail-coupling rule — the spec says
// "MUST use D1 `||` concatenation for LIKE binding", and both code paths
// produce matching rows; we assert the user-visible filter result.
function listRequest(params) {
  const url = new URL("https://example.com/api/notebooks");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: "GET" });
}

describe("GET /api/notebooks — category filter (drift #7)", () => {
  beforeAll(async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        share_url TEXT NOT NULL,
        categories TEXT NOT NULL DEFAULT '[]',
        tags TEXT NOT NULL DEFAULT '[]',
        preview_url TEXT,
        likes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ).run();
    await env.DB.prepare("DELETE FROM notebooks").run();

    const seed = [
      ["ed-1", "Education One", "A notebook about education", "education"],
      ["ed-2", "Education Two", "Another education notebook", "education"],
      ["tech-1", "Tech One", "A technology notebook", "technology"],
      ["ed-tech", "Ed + Tech", "Cross-category", "education,technology"],
      ["other-1", "Other", "No categories", null],
    ];
    for (const [id, title, desc, cats] of seed) {
      const categories = cats ? JSON.stringify(cats.split(",")) : "[]";
      await env.DB.prepare(
        "INSERT INTO notebooks (id, title, description, share_url, categories, tags) VALUES (?1, ?2, ?3, ?4, ?5, '[]')",
      )
        .bind(id, title, desc, `https://notebooklm.google.com/${id}`, categories)
        .run();
    }
  });

  it("returns only education notebooks when category=education", async () => {
    const res = await handleList(listRequest({ category: "education" }), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.notebooks.map((n) => n.id);
    // Must include notebooks whose categories array contains "education".
    expect(ids).toContain("ed-1");
    expect(ids).toContain("ed-2");
    expect(ids).toContain("ed-tech");
    // Must NOT include non-education notebooks.
    expect(ids).not.toContain("tech-1");
    expect(ids).not.toContain("other-1");
    // total reflects the filtered count, not the whole table.
    expect(body.total).toBe(3);
  });

  it("returns only technology notebooks when category=technology", async () => {
    const res = await handleList(listRequest({ category: "technology" }), env);
    const body = await res.json();
    const ids = body.notebooks.map((n) => n.id);
    expect(ids).toContain("tech-1");
    expect(ids).toContain("ed-tech");
    expect(ids).not.toContain("ed-1");
    expect(ids).not.toContain("other-1");
    expect(body.total).toBe(2);
  });
});