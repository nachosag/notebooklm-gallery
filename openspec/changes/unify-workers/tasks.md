# Tasks: Unify Workers

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~405 (7 PRs × ≤150 each) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

## Phase 1: Foundation — vitest KV + CI (PR 1, no behavior change)

- [x] 1.1 Add `kvNamespaces: { SITEMAP_CACHE: "test-cache" }` to `workers/api/vitest.config.mjs` (also pinned `miniflare.compatibilityDate` to unblock workerd)
- [x] 1.2 Add Worker `wrangler deploy --dry-run` job to `.github/workflows/deploy.yml`
- [x] 1.3 Verify: dry-run exits 0, shows 3 bindings (SITEMAP_CACHE, DB, PREVIEW_IMAGES)

## Phase 2: Fix SITE_URL — bug #166 (PR 2, RED→GREEN)

- [x] 2.1 **RED**: Create `workers/api/test/integration/seo.test.js` — every `<loc>` starts with `https://notebooklm-gallery.pages.dev/`; none contains `notebooklm.gallery`. Run: FAILS.
- [x] 2.2 **GREEN**: `workers/api/src/handlers/seo.js` L5 → `SITE_URL = "https://notebooklm-gallery.pages.dev"`
- [x] 2.3 Verify: `npm test` passes (64/64)

## Phase 3: Like rate limit 30/h — drift #3 (PR 3, RED→GREEN)

- [x] 3.1 **RED**: Add test in `workers/api/test/integration/ratelimit.test.js` — 429 at 30 like actions/hour. Run: FAILS.
- [x] 3.2 **GREEN**: `workers/api/src/handlers/likes.js` L7 → `RATE_LIMIT_MAX = 30`
- [x] 3.3 Verify: `npm test` passes (66/66)

## Phase 4: Validation lenient categories — drift #4 (PR 4, RED→GREEN)

- [x] 4.1 **RED**: Add test in `workers/api/test/unit/validation.test.js` — absent `categories` passes. Run: FAILS.
- [x] 4.2 **GREEN**: `workers/api/src/utils/validation.js` L51-57 — allow 0+ categories, max 3, each must be valid slug
- [x] 4.3 Update 2 existing tests: "rejects empty array" and "rejects missing categories" → assert they PASS
- [x] 4.4 Verify: `npm test` passes (67/67); 0-3 cats valid, 4+ rejected

## Phase 5: Pin drifts #2/#5/#6/#7 (PR 5, GREEN-only — no code change)

- [x] 5.1 `workers/api/test/unit/ip.test.js` — assert `hashIp("x")` = SHA-256 of `"x"` (no salt)
- [x] 5.2 `workers/api/test/integration/submit.test.js` — assert R2 `put()` failure → 201 without `preview_url`
- [x] 5.3 `workers/api/test/integration/notebooks.test.js` — assert category filter with D1 `||` concat
- [x] 5.4 Verify: `npm test` passes (71/71, all green against current code)

## Phase 6: `_redirects` + strip notebook block (PR 6)

- [x] 6.1 Create `frontend/_redirects`: `/notebook/*  /notebook  200` (Pretty-URL-safe variant of spec's `/notebook.html` target — see deviation note)
- [x] 6.2 Remove `/notebook/` SPA handler from `frontend/_worker.js`
- [x] 6.3 Verify: `wrangler pages dev` boots, `GET /` -> 200. `/notebook/abc` -> 200 deferred to maintainer live curl (task 7.4); dev-targeting `/notebook.html` returned 308 (Pages Pretty URLs) so rule retargeted to `/notebook`.

## Phase 7: Cutover — thin proxy + service binding (PR 7)

- [x] 7.1 Add `[[services]]` to `frontend/wrangler.toml`: `binding = "API"`, `service = "notebooklm-gallery-api"`
- [x] 7.2 Reduce `frontend/_worker.js` to ~15-line proxy: `/api/*`, `/sitemap.xml`, `/robots.txt` → `env.API.fetch()`; rest → `env.ASSETS.fetch()`
- [x] 7.3 Add `wrangler deploy --env production` to CI before Pages deploy
- [x] 7.4 Verify: Worker `wrangler deploy --dry-run --env production` exits 0 (3 bindings). Pages dry-run + live `curl` 3 routes + SPA → 200 deferred to maintainer (no real deploy; `wrangler pages dev` headless not exercisable here).
