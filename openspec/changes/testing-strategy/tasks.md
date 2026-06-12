# Tasks: Add Testing Infrastructure

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 580-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Vitest config + package.json + unit tests | PR 1 | Foundation — no integration tests yet |
| 2 | Integration tests (submit, turnstile, ratelimit) | PR 2 | Depends on PR 1 for test infrastructure |
| 3 | CI workflow | PR 3 | Independent but logical final step |

---

## Phase 1: Infrastructure Setup

- [x] 1.1 Create `workers/api/vitest.config.js` — configure `@cloudflare/vitest-pool-workers` with wrangler.toml path (~15 lines)
- [x] 1.2 Modify `workers/api/package.json` — add `vitest`, `@cloudflare/vitest-pool-workers` devDeps; add `test` and `test:watch` scripts (~8 lines changed)
- [x] 1.3 Create `workers/api/test/unit/` and `workers/api/test/integration/` directories

## Phase 2: Unit Tests

- [x] 2.1 Create `workers/api/test/unit/validation.test.js` — `describe("validateNotebook")` with 13 scenarios from spec: valid data, title boundaries (3/120 chars), title missing/empty, description boundaries (20/1000 chars), share_url formats (4 invalid + valid), categories (empty/4 items/invalid/non-array), categories boundaries (1/3), tags (11 items/short/non-array), valid tags, optional tags (~150 lines)
- [x] 2.2 Create `workers/api/test/unit/ip.test.js` — `describe("hashIp")` with 4 scenarios: same IP determinism, different IPs differ, 64-char hex format, empty string no crash (~50 lines)

## Phase 3: Integration Tests

- [ ] 3.1 Create `workers/api/test/integration/submit.test.js` — `describe("handleSubmit")` with scenarios: valid JSON → 201, valid multipart → 201 + R2, malformed JSON → 400, validation blocks Turnstile, dev mode bypass, invalid token → 403, valid token proceeds, under limit → proceeds, at limit → 429, file upload to R2, base64 image, invalid image type → 400, image >5MB → 400, R2 failure non-fatal, D1 insert failure → 500 (~200 lines)
- [ ] 3.2 Create `workers/api/test/integration/turnstile.test.js` — `describe("verifyTurnstile")` with scenarios: dev mode bypass, production rejects invalid, production accepts valid (~80 lines)
- [ ] 3.3 Create `workers/api/test/integration/ratelimit.test.js` — `describe("checkRateLimit")` with scenarios: under limit allows, at limit rejects (~60 lines)

## Phase 4: CI Workflow

- [ ] 4.1 Create `.github/workflows/test.yml` — trigger on `pull_request`, ubuntu-latest, Node 18+, checkout, setup-node with npm cache, `cd workers/api && npm ci && npm test` (~40 lines)
