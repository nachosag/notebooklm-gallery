# seo-routes Specification

## Purpose

SEO endpoints: dynamically generated `sitemap.xml` and `robots.txt`. The sitemap includes all notebook detail URLs plus static pages.

## Requirements

### Requirement: Sitemap Generation (bug #166 — SITE_URL MUST be `https://notebooklm-gallery.pages.dev`)

The system SHALL generate a valid XML sitemap at `GET /sitemap.xml`.

- `SITE_URL` constant MUST be exactly `"https://notebooklm-gallery.pages.dev"`. No other value is acceptable.
- Static URLs: home (`/`, priority 1.0, changefreq daily), submit (`/submit`, priority 0.5, changefreq weekly).
- Dynamic URLs: one `<url>` per notebook at `/notebook/{id}`, priority 0.8, changefreq weekly, `lastmod` from `created_at`.
- Response `Content-Type` MUST be `application/xml`.
- XML MUST conform to sitemaps.org schema (`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`).

#### Scenario: Sitemap with notebooks

- GIVEN 2 notebooks in DB with ids "aaa" and "bbb"
- WHEN `GET /sitemap.xml`
- THEN status 200, Content-Type is `application/xml`
- AND XML contains `<loc>https://notebooklm-gallery.pages.dev/</loc>`
- AND XML contains `<loc>https://notebooklm-gallery.pages.dev/submit</loc>`
- AND XML contains `<loc>https://notebooklm-gallery.pages.dev/notebook/aaa</loc>`
- AND XML contains `<loc>https://notebooklm-gallery.pages.dev/notebook/bbb</loc>`
- AND every `<loc>` starts with `https://notebooklm-gallery.pages.dev/`

#### Scenario: Sitemap with empty DB

- GIVEN no notebooks in DB
- WHEN `GET /sitemap.xml`
- THEN XML contains only the 2 static URLs (home and submit)
- AND all `<loc>` values start with `https://notebooklm-gallery.pages.dev/`

#### Scenario: SITE_URL correctness assertion

- GIVEN any DB state
- WHEN sitemap is generated
- THEN parsing the XML and extracting all `<loc>` text content
- AND EVERY `<loc>` value starts with `https://notebooklm-gallery.pages.dev/`
- AND NO `<loc>` value contains `notebooklm.gallery` (the wrong domain)

### Requirement: Sitemap Caching

The system SHOULD cache the sitemap in KV (`SITEMAP_CACHE` binding) for performance.

- On request: check KV for key `sitemap.xml`; if hit, return cached XML.
- After generation: store XML in KV via `ctx.waitUntil()` (non-blocking).
- If KV is unavailable or errors: generate sitemap without caching (graceful degradation).

#### Scenario: Cache hit

- GIVEN KV contains cached sitemap XML
- WHEN `GET /sitemap.xml`
- THEN cached XML is returned without querying DB

#### Scenario: Cache miss

- GIVEN KV is empty
- WHEN `GET /sitemap.xml`
- THEN sitemap is generated from DB and stored in KV

#### Scenario: KV unavailable

- GIVEN `SITEMAP_CACHE` binding is undefined
- WHEN `GET /sitemap.xml`
- THEN sitemap is generated from DB without error

### Requirement: Robots.txt

The system SHALL return a valid `robots.txt` at `GET /robots.txt`.

- Content: `User-agent: *\nAllow: /\n\nSitemap: https://notebooklm-gallery.pages.dev/sitemap.xml\n`.
- `Content-Type` MUST be `text/plain`.
- Sitemap URL MUST use the same `SITE_URL` as the sitemap.

#### Scenario: Robots.txt content

- WHEN `GET /robots.txt`
- THEN status 200, Content-Type is `text/plain`
- AND body contains `Sitemap: https://notebooklm-gallery.pages.dev/sitemap.xml`
- AND body contains `User-agent: *`
- AND body contains `Allow: /`
