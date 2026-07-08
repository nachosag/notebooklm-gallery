# Design: Unify Workers — Deploy Tested Code to Production

## Technical Approach

Deploy `workers/api/` as Worker `notebooklm-gallery-api` against the same D1/R2/KV. Reach it via Pages Service Binding (`services` in `frontend/wrangler.toml`); `_worker.js` becomes a ~15-line proxy forwarding `/api/*`, `/sitemap.xml`, `/robots.txt` via `env.API.fetch()`. Pages serves static + `/notebook/*` via `_redirects`. Worker routes on `.pages.dev` are impossible (shared zone), hence Service Binding — zero-cost, zero-DNS, and fixes cutover atomicity. 7 drifts + bug #166 each get a PR.

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Pages ↔ Worker connection | Service Binding: `[[services]] binding = "API", service = "notebooklm-gallery-api"` in `frontend/wrangler.toml` | Recommended Pages + Worker pattern. Worker routes on `.pages.dev` are impossible (shared zone). |
| 2 | `_worker.js` lifecycle | Reduce to ~15-line thin proxy in cutover PR (do NOT delete) | Eliminates atomicity risk. |
| 3 | `/notebook/*` SPA routing | `frontend/_redirects`: `/notebook/*  /notebook.html  200` | Pages-native; status 200 preserves URL. |
| 4 | `TURNSTILE_SECRET` | `wrangler secret put TURNSTILE_SECRET --env production` | Secret never committed; dev unset bypasses. |

| 5 | Env separation | Single `[env.production]`; dev uses default env | One file = one review surface. |
| 6 | KV in `vitest.config.mjs` | `kvNamespaces: { SITEMAP_CACHE: "test-cache" }` | Matches prod; `seo.js` degrades if undefined. |
| 7 | PR slicing | 7 chained PRs, ≤150 lines each | 400-line budget, strict TDD. |
| 8 | Deploy validation | `wrangler deploy --dry-run --env production` per PR; live curl post-cutover | Safe way to verify deploy without burn. |

## Data Flow

```
Internet → Cloudflare edge → Pages Function (_worker.js thin proxy)
                                  ├─ /api/*, /sitemap.xml, /robots.txt
                                  │     → env.API.fetch() → Worker (notebooklm-gallery-api)
                                  │           └─ env.DB, env.PREVIEW_IMAGES, env.SITEMAP_CACHE
                                  └─ /, /notebook/*, *.html, /css, /js
                                        → env.ASSETS.fetch() (Pages static)
                                              └─ /notebook/* → _redirects → /notebook.html
```

Apex is `notebooklm-gallery.pages.dev` (no custom domain). Pages Function is the front door; Worker is reached via service binding.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `workers/api/wrangler.toml` | Modify | `name = "notebooklm-gallery-api"` |
| `workers/api/vitest.config.mjs` | Modify | `kvNamespaces: { SITEMAP_CACHE: "test-cache" }` |
| `workers/api/src/handlers/seo.js` | Modify | L5: `SITE_URL` → pages.dev |
| `workers/api/src/handlers/likes.js` | Modify | L7: `RATE_LIMIT_MAX` 100 → 30 |
| `workers/api/src/utils/validation.js` | Modify | 0+ cats, max 3 (drift #4) |
| `frontend/wrangler.toml` | Modify | `[[services]]` binding → `notebooklm-gallery-api` |
| `frontend/_redirects` | Create | `/notebook/*  /notebook.html  200` |
| `frontend/_worker.js` | Modify | Reduce to ~15-line thin proxy (PR 7) |
| `.github/workflows/deploy.yml` | Modify | Add Worker `wrangler deploy` job |
| `test/integration/{seo,likes,r2-nonfatal,notebooks-filters}.test.js` | Create | 4 test files |
| `test/unit/validation.test.js` | Modify | "absent" + 4-cat cases |
| `test/unit/ip.test.js` | Modify | `hashIp("x")` ≠ salted hash (drift #2 pin) |

## PR Slicing (chained, stacked-to-main, ≤400 lines each)

| # | Title | Files | Lines | Verify | Rollback |
|---|-------|-------|-------|--------|----------|
| 1 | Foundation: routes + vitest KV + CI Worker step | 3 mod | ~40 | dry-run exits 0; shows 3 routes | `git revert` |
| 2 | **Fix SITE_URL (bug #166)** — ship fast | 1 src + 1 test | ~30 | `npm test` passes | `git revert` |
| 3 | Like rate limit 30/h (drift #3) | 1 src + 1 test | ~70 | `npm test` passes | `git revert` |
| 4 | Validation: lenient categories (drift #4) | 1 src + 1 mod | ~55 | `npm test` passes | `git revert` |
| 5 | Pin drifts #2/#5/#6/#7 in tests | 3 new + 2 mod | ~150 | `npm test` passes (no behavior change) | `git revert` |
| 6 | `_redirects` for SPA + strip `_worker.js` notebook block | 1 new + 1 mod | ~30 | `wrangler pages dev`; `curl /notebook/abc` → 200 | revert `_redirects` |
| 7 | **Cutover**: reduce `_worker.js` to thin proxy + deploy Worker via service binding | 1 mod + 1 CI | ~30 | live `curl` 3 routes + 1 SPA; `wrangler pages dev` proxy | `wrangler rollback` + `git revert` |

## Testing Strategy

| Layer | Approach |
|-------|----------|
| Unit | Vitest, no Workers runtime |
| Integration | `@cloudflare/vitest-pool-workers` + `env.DB` |
| KV (new) | `vitest.config.mjs` adds `SITEMAP_CACHE: "test-cache"` |
| Smoke (manual) | Post-cutover `curl` + grep `<loc>` |

## Migration / Rollout

1. PRs 1–6 land on `main` (no production change).
2. PR 7: CI deploys Worker FIRST, then Pages with thin proxy. Order matters.
3. Live: `curl` `/api/notebooks`, `/sitemap.xml`, `/notebook/abc` → 200.
4. Rollback: `git revert` per PR; PR 7 `wrangler rollback` + Pages rollback.

**Open questions**: `notebooklm.gallery` does not exist (user-confirmed). Custom domain later → revisit `ALLOWED_ORIGINS` + `SITE_URL`.
