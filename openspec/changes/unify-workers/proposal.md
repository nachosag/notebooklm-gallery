# Proposal: Unify Workers — single source of truth for the API

## Intent

Production runs `frontend/_worker.js` (758-line monolith, untested). The 58-test suite covers `workers/api/src/` (~888 lines, never deployed). Every passing test validates code users do not hit; CI green ≠ production safe. Issue #4 is open. Unify by deploying the tested code.

## Scope

**In**: deploy `workers/api/` as `notebooklm-gallery-api`; routes `/api/*`, `/sitemap.xml`, `/robots.txt` → Worker; `/notebook/*` → `frontend/_redirects`; `TURNSTILE_SECRET` as Worker secret; reconcile 7 drifts case-by-case.

**Out**: D1/R2/KV, UI, new features, Worker rename, DNS.

## Capabilities

`sdd-spec` creates the baseline (`openspec/specs/` does not exist). **New**: `api-notebooks`, `api-likes`, `api-submit`, `cors-policy`, `seo-routes`, `deployment-topology`. **Modified**: None.

## Approach

1. `routes` in `workers/api/wrangler.toml [env.production]`.
2. `_redirects` for `/notebook/*` SPA fallback.
3. `wrangler secret put TURNSTILE_SECRET --env production`.
4. CI: Worker, then Pages. Delete `_worker.js` in a follow-up PR.
5. Each drift in its own chained PR (strict TDD; tests pin the chosen winner).

## Affected Areas

**Modified**: `workers/api/wrangler.toml` (`routes`); `cors.js` (#1); `ip.js` (#2); `ratelimit.js` (#3); `likes.js` (#3, #5); `validation.js` (#4, #7); `notebooks.js` (#7); `submit.js` (#4, #6); `frontend/wrangler.toml`; `deploy.yml`. **Removed**: `frontend/_worker.js`. **New**: `frontend/_redirects`.

## Behavioral Drifts — handoff to sdd-spec

Winner decided in specs phase (case-by-case). Line refs in exploration.md.

| # | Drift | Production | Tested | Rec. |
|---|-------|------------|--------|------|
| 1 | CORS | `*` | allow-list | Tested |
| 2 | IP hash salt | `ip+salt` | bare `ip` | Tested |
| 3 | Like rate limit | 30/h | 100/h | Production |
| 4 | Validation | lenient, `*.notebooklm.google` | strict, exact host, https | Tested |
| 5 | Like existence | silent insert | 404 | Tested |
| 6 | Image R2 error | 400 hard fail | 400 validation, log R2 | Tested |
| 7 | FTS5 cat filter | JS concat | D1 `\|\|` | Tested |

→ All 7 deferred to sdd-spec.

## Risks

| Risk | Mitigation |
|------|------------|
| Route misconfig | `--dry-run`; dev Pages first |
| `/notebook/*` collision | Worker matches only the 3 paths |
| `TURNSTILE_SECRET` not migrated | `wrangler secret put`; smoke-test |
| **CORS rejects custom domain** | **Blocker**: `ALLOWED_ORIGINS` lacks `https://notebooklm.gallery` (used by `seo.js` SITE_URL) — user must confirm |

## Rollback

`wrangler rollback`; keep `_worker.js` as no-op stub during transition. Bindings are referenced, not migrated — rollback is config-only.

## Dependencies

Full Cloudflare + wrangler access. `wrangler` v4. `TURNSTILE_SECRET` value. Verify prod D1/KV IDs.

## Success Criteria

`wrangler deploy --dry-run` passes both · 58 tests pass + 7 delta specs pin drift winners · `/api/*`, `/sitemap.xml`, `/robots.txt` work on `notebooklm.gallery` · Pages static + `/notebook/*`; Worker API/SEO · `TURNSTILE_SECRET` is a Worker secret · `ALLOWED_ORIGINS` includes the custom domain.
