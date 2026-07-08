import { describe, it, expect, beforeAll } from "vitest";
import { env, createExecutionContext } from "cloudflare:test";
import { handleSitemap, handleRobots } from "../../src/handlers/seo.js";

// Helpers to drive the SEO handlers directly (integration-level).
function sitemapRequest() {
  return new Request("https://example.com/sitemap.xml", { method: "GET" });
}

function robotsRequest() {
  return new Request("https://example.com/robots.txt", { method: "GET" });
}

function locs(xml) {
  return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gs)).map((m) =>
    m[1].trim(),
  );
}

describe("GET /sitemap.xml — SITE_URL correctness (bug #166)", () => {
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
        ip_hash TEXT
      )`,
    ).run();
    // Clean + seed two notebooks so dynamic <loc> entries are exercised.
    await env.DB.prepare("DELETE FROM notebooks").run();
    await env.DB.prepare(
      "INSERT INTO notebooks (id, title, description, share_url) VALUES ('aaa', 'A', 'aaa description here', 'https://notebooklm.google.com/a')",
    ).run();
    await env.DB.prepare(
      "INSERT INTO notebooks (id, title, description, share_url) VALUES ('bbb', 'B', 'bbb description here', 'https://notebooklm.google.com/b')",
    ).run();
  });

  it("returns 200 with application/xml content type", async () => {
    const ctx = createExecutionContext();
    const res = await handleSitemap(sitemapRequest(), env, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/xml");
  });

  it("every <loc> starts with https://notebooklm-gallery.pages.dev/", async () => {
    const ctx = createExecutionContext();
    const res = await handleSitemap(sitemapRequest(), env, ctx);
    const xml = await res.text();
    const found = locs(xml);
    // Real assertion: collection is non-empty AND every entry starts with the
    // production domain. Production currently emits notebooklm.gallery -> RED.
    expect(found.length).toBeGreaterThan(0);
    for (const url of found) {
      expect(url.startsWith("https://notebooklm-gallery.pages.dev/")).toBe(true);
    }
  });

  it("no <loc> contains the wrong domain notebooklm.gallery", async () => {
    const ctx = createExecutionContext();
    const res = await handleSitemap(sitemapRequest(), env, ctx);
    const xml = await res.text();
    const found = locs(xml);
    expect(found.length).toBeGreaterThan(0);
    for (const url of found) {
      expect(url.includes("notebooklm.gallery")).toBe(false);
    }
  });

  it("includes the static home and submit URLs", async () => {
    const ctx = createExecutionContext();
    const res = await handleSitemap(sitemapRequest(), env, ctx);
    const xml = await res.text();
    const found = locs(xml);
    expect(found).toContain("https://notebooklm-gallery.pages.dev/");
    expect(found).toContain("https://notebooklm-gallery.pages.dev/submit");
  });

  it("includes one notebook <loc> per notebook in the DB", async () => {
    const ctx = createExecutionContext();
    const res = await handleSitemap(sitemapRequest(), env, ctx);
    const xml = await res.text();
    const found = locs(xml);
    expect(found).toContain(
      "https://notebooklm-gallery.pages.dev/notebook/aaa",
    );
    expect(found).toContain(
      "https://notebooklm-gallery.pages.dev/notebook/bbb",
    );
  });
});

describe("GET /robots.txt — SITE_URL correctness", () => {
  it("references the production sitemap URL", async () => {
    const res = handleRobots(robotsRequest(), env);
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain");
    expect(body).toContain(
      "Sitemap: https://notebooklm-gallery.pages.dev/sitemap.xml",
    );
    expect(body).not.toContain("notebooklm.gallery/sitemap.xml");
  });
});