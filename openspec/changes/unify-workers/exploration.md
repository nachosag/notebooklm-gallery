# Exploration: Unify Workers — `workers/api/src/` vs `frontend/_worker.js`

## Current State

The project has **two independent implementations** of the same API:

| Aspect | `workers/api/src/` | `frontend/_worker.js` |
|--------|---------------------|------------------------|
| **Deployed** | No (only tested) | Yes (production) |
| **Tested** | Yes (5 test files) | No |
| **Lines** | ~888 total (modular) | 758 (monolith) |
| **Router** | `itty-router` | Manual regex matching |
| **Bindings** | D1, R2, KV | D1, R2, KV |
| **Dependencies** | `itty-router` | Zero (vanilla JS) |
| **Compatibility date** | `2025-01-01` | `2025-01-01` |

The critical issue: **tests validate code that never runs in production**. Changes to `workers/api/src/` have zero effect on what users experience.

---

## Affected Areas

### Files to Modify/Replace

- `frontend/_worker.js` — The 758-line monolith that needs to be replaced or refactored
- `frontend/wrangler.toml` — Pages Functions config (may need bundling config)
- `frontend/package.json` — Needs build scripts and dependencies if bundling
- `workers/api/src/index.js` — Entry point that may become the single source of truth
- `workers/api/wrangler.toml` — May need changes for shared module resolution
- `workers/api/package.json` — May need new scripts

### Files That Would Be Consumed (not deleted)

- `workers/api/src/handlers/*.js` — All handler modules
- `workers/api/src/middleware/*.js` — CORS, rate limiting, Turnstile
- `workers/api/src/utils/*.js` — IP hashing, validation
- `workers/api/src/db/schema.js` — Database schema

---

## Precise Duplication Map

### Routes (identical in both)

| Route | Handler `_worker.js` | Handler `api/src/` |
|-------|----------------------|---------------------|
| `GET /api/notebooks` | `handleList` (L173-252) | `handleList` (notebooks.js L49-136) |
| `GET /api/notebooks/:id` | `handleDetail` (L254-266) | `handleDetail` (notebooks.js L138-158) |
| `POST /api/notebooks` | `handleSubmit` (L268-453) | `handleSubmit` (submit.js L124-238) |
| `POST /api/notebooks/:id/like` | `handleLike` (L455-511) | `handleLike` (likes.js L10-104) |
| `GET /api/categories` | `handleCategories` (L513-540) | `handleCategories` (notebooks.js L160-181) |
| `GET /api/tags/trending` | `handleTrendingTags` (L542-556) | `handleTrendingTags` (notebooks.js L183-205) |
| `GET /api/images/*` | `handleImage` (L558-568) | `handleImage` (index.js L14-25) |
| `GET /sitemap.xml` | `handleSitemap` (L574-626) | `handleSitemap` (seo.js L15-85) |
| `GET /robots.txt` | `handleRobots` (L628-637) | `handleRobots` (seo.js L90-99) |

### Shared Functions (duplicated verbatim or near-verbatim)

| Function | `_worker.js` lines | `api/src/` location |
|----------|-------------------|---------------------|
| `sanitizeFts5` | L55-62 | `handlers/notebooks.js` L18-25 |
| `rowToNotebook` | L41-53 | `handlers/notebooks.js` L27-39 |
| `safeJson` | L33-38 | `handlers/notebooks.js` L41-47 |
| `CATEGORIES_META` | L522-533 | `handlers/notebooks.js` L5-16 |
| `CATEGORIES` (validation) | L86-97 | `utils/validation.js` L5-16 |

---

## Behavioral Drift (Critical Differences)

### 1. CORS Policy — **WILDLY DIFFERENT**

**`_worker.js` (L4-8):**
```js
"Access-Control-Allow-Origin": "*"  // WILDCARD — allows ANY origin
```

**`api/src/middleware/cors.js` (L1-4):**
```js
const ALLOWED_ORIGINS = [
  "https://notebooklm-gallery.pages.dev",
  "http://localhost:8787",
];
// Uses specific origin, not wildcard; adds Vary: Origin, Max-Age: 86400
```

**Impact**: Production uses wildcard CORS (allows any site to call the API). The tested code restricts to specific origins. This is a **security drift**.

### 2. IP Hash — **SALT MISSING**

**`_worker.js` (L64-70):**
```js
const data = new TextEncoder().encode(ip + "notebooklm-gallery-salt");
```

**`api/src/utils/ip.js` (L1-6):**
```js
const data = encoder.encode(ip);  // NO SALT
```

**Impact**: Hashes are incompatible. The rate limiter uses the same hash, so if both ran against the same DB, they'd track different IPs. Production hashes with salt; tested code hashes without.

### 3. Rate Limit — **DIFFERENT LIMITS**

| Metric | `_worker.js` | `api/src/` |
|--------|-------------|------------|
| Like limit | 30/hour (L166) | 100/hour (likes.js L7) |
| Response format | `{ allowed: bool }` | `{ allowed: bool, remaining: number }` |

**Impact**: Production allows 30 likes/hour; tested code allows 100. The tested code is more permissive.

### 4. Validation — **DIFFERENT RULES**

| Rule | `_worker.js` | `api/src/` |
|------|-------------|------------|
| Title type check | `typeof data.title !== "string"` (L101-106) | No type check (validation.js L21) |
| Categories required | No (L132: optional) | Yes (validation.js L51-53: 1-3 required) |
| URL hostname check | `.includes("notebooklm.google")` (L123) | `=== "notebooklm.google.com"` (L40) |
| URL protocol check | None (L121-131) | `parsed.protocol !== "https:"` (L38) |
| Error response format | `{ error: { code, message, fields: [...] } }` (array) | `{ error: { code, message, fields: {...} } }` (object) |

**Impact**: The `share_url` check in `_worker.js` is more permissive (allows any subdomain of `notebooklm.google`). The API worker requires exact `notebooklm.google.com` over HTTPS.

### 5. Like Handler — **NOTEBOOK EXISTENCE CHECK MISSING**

**`_worker.js` (L455-511):** No check for notebook existence. Directly inserts/deletes from `likes_log`.

**`api/src/handlers/likes.js` (L10-25):** Checks `SELECT id FROM notebooks WHERE id = ?1` first; returns 404 if not found.

**Impact**: Production allows liking non-existent notebooks (silently fails or corrupts data). Tested code properly validates existence.

### 6. Image Upload Error Handling

**`_worker.js` (L336-420):** Returns 400 on ANY image error (validation or R2 failure).

**`api/src/handlers/submit.js` (L173-196):** Returns 400 only for validation errors; on R2 failure, logs error and continues (non-fatal).

**Impact**: Production fails the entire submission if R2 is temporarily unavailable. Tested code gracefully degrades.

### 7. FTS5 Query Building

**`_worker.js` (L188-216):** Builds FTS5 query with raw string concatenation for category filter:
```js
query += " AND n.categories LIKE ?2";
params.push(`%"${category}"%`);
```

**`api/src/handlers/notebooks.js` (L73-96):** Uses different parameter binding pattern with conditional SQL:
```js
${category ? "AND n.categories LIKE '%' || ?2 || '%'" : ""}
```

**Impact**: Functionally similar but the parameter binding approach differs. The API version uses D1's `||` concatenation operator; `_worker.js` builds the string in JS.

---

## Approaches

### Option A: Bundle `workers/api/src/` into `frontend/_worker.js`

**Concept**: Use esbuild or wrangler's built-in bundling to import from `workers/api/src/` into the Pages Function.

**Implementation**:
- Add `workers/api/src/` as a workspace dependency or use relative imports
- Configure `frontend/wrangler.toml` with `main` pointing to a build output
- Add esbuild/rollup build step to `frontend/package.json`
- Pages Functions support ES module imports with bundling

**Pros**:
- Single source of truth for all business logic
- Tests run against the same code that deploys
- Minimal change to deployment topology (still Pages + _worker.js)
- Can keep Pages for static assets + SEO routes + client-side routing
- Incremental — can migrate file-by-file

**Cons**:
- Adds build complexity (esbuild/rollup config)
- Need to resolve binding differences (CORS, IP hash salt, rate limits)
- Must reconcile behavioral drift before unifying
- Pages Functions bundling has edge cases with Workers runtime APIs
- Need to handle the `_worker.js` → bundled entry point transition

**Effort**: Medium-High (build config + behavioral reconciliation + testing)

### Option B: Move Tests to Cover `_worker.js` Directly

**Concept**: Keep the monolith, write tests against it using `@cloudflare/vitest-pool-workers`.

**Implementation**:
- Create `frontend/test/` directory
- Write tests importing from `frontend/_worker.js`
- Configure vitest to use `_worker.js` as main entry
- Delete `workers/api/` entirely

**Pros**:
- Simplest conceptual change
- No bundling or build pipeline changes
- Tests match production exactly by definition

**Cons**:
- Tests a 758-line monolith (harder to maintain, harder to isolate failures)
- Loses modular architecture (handlers, middleware, utils separation)
- Still duplicates code if any other consumer needs the logic
- Doesn't fix the architectural debt — just papers over it
- `itty-router` dependency gets removed (currently only used in tests)
- Future changes still happen in one big file

**Effort**: Low-Medium (test writing, but architecture stays poor)

### Option C: Migrate to Standalone Worker + Pages for Static Only

**Concept**: Deploy `workers/api/` as the sole Worker; Pages serves only static assets. All `/api/*` routes go to the Worker via service binding or route pattern.

**Implementation**:
- Deploy `workers/api/` as `notebooklm-gallery-api` Worker
- Configure Pages to serve only static assets (HTML, CSS, JS)
- Use Cloudflare route patterns: `notebooklm.gallery/api/*` → Worker, everything else → Pages
- Add Cloudflare DNS route or `wrangler.toml` routes configuration

**Pros**:
- Cleanest architecture — API Worker is the single source of truth
- Pages handles only what it's good at (static assets, client-side routing)
- Tests run against the exact production Worker
- No bundling needed — direct imports work in Workers
- Can use `wrangler dev` locally with full Worker semantics
- Aligns with Cloudflare's recommended architecture

**Cons**:
- Changes deployment topology (may need DNS/route changes)
- Need to configure route patterns in Cloudflare dashboard or `wrangler.toml`
- SEO routes (`/sitemap.xml`, `/robots.txt`) currently live in Pages — would move to Worker
- Client-side routing (`/notebook/*`) stays in Pages — need to ensure no conflicts
- Slightly more complex Cloudflare setup (two deployments instead of one)

**Effort**: Medium (deployment config changes, but code changes are minimal)

### Option D: Hybrid — Shared Module + Thin `_worker.js` Wrapper (NEW)

**Concept**: Extract ALL business logic into a shared package (e.g., `packages/api/`). Both `workers/api/` and `frontend/_worker.js` import from it. The `_worker.js` becomes a thin wrapper that adds Pages-specific behavior (static asset serving, client-side routing).

**Implementation**:
- Create `packages/api/` with all handlers, middleware, utils
- `workers/api/src/index.js` imports from `packages/api/` and adds itty-router
- `frontend/_worker.js` imports from `packages/api/` and adds Pages-specific logic
- esbuild bundles `packages/api/` into `_worker.js` for Pages deployment
- Shared vitest config tests `packages/api/` directly

**Pros**:
- Both deployment targets use identical business logic
- Pages keeps its advantage (static assets + client routing)
- Worker keeps its advantage (direct Cloudflare APIs, no bundling needed)
- Tests target the shared package — covers both deployments
- Incremental migration possible

**Cons**:
- Most complex setup (monorepo structure, shared package)
- Still need bundling for `_worker.js`
- Two entry points to maintain (though they're thin wrappers)
- May be over-engineering for a project of this size

**Effort**: High (monorepo setup, build pipeline, two wrappers)

---

## Recommendation

**Option C (Standalone Worker + Pages for Static)** is the recommended approach.

**Why**:
1. **Aligns with Cloudflare's architecture** — Workers for compute, Pages for static. This is the intended use pattern.
2. **Zero bundling complexity** — The Worker runs its own code directly. No esbuild/rollup needed.
3. **Tests match production exactly** — The same `workers/api/src/index.js` that runs in tests deploys as the Worker.
4. **Simplest code change** — The `workers/api/src/` code is already modular and tested. Just need to configure deployment.
5. **Pages still handles static assets** — HTML, CSS, JS, client-side routing all stay in Pages.
6. **SEO routes can live in either place** — But putting them in the Worker is cleaner (they're API-like responses, not static files).

**The key insight**: The project already has the right architecture in `workers/api/` — modular, tested, clean. The problem isn't the code; it's the deployment topology. Option C fixes the topology without rewriting code.

**What needs to change**:
1. Deploy `workers/api/` as the production Worker
2. Configure Cloudflare routes: `notebooklm.gallery/api/*` → Worker, `notebooklm.gallery/sitemap.xml` → Worker, `notebooklm.gallery/robots.txt` → Worker
3. Pages serves everything else (static assets, HTML, client-side routing)
4. Remove `frontend/_worker.js` (or keep as fallback during transition)
5. Reconcile behavioral differences (CORS, IP hash, rate limits, validation) — use the API Worker's versions as they're more correct

---

## Open Questions for Proposal Phase

1. **CORS policy**: Production uses wildcard `*`. The API Worker restricts to specific origins. Which is correct? If the app is public and the API is called from the browser, wildcard may be intentional. If there's a separate admin panel or server-side consumer, restricted origins make sense.

2. **IP hash salt**: The `_worker.js` includes a salt (`notebooklm-gallery-salt`). The API Worker doesn't. Which is correct? Salted hashes are more secure against rainbow table attacks, but since these are IP hashes (not passwords), the practical difference is minimal. Recommend: use the salted version for defense in depth.

3. **Like rate limit**: 30/hour (production) vs 100/hour (tested). Which limit is correct? The tested code is more permissive. Recommend: use 30/hour (more conservative, matches production).

4. **Category validation**: Production allows 0+ categories. The API Worker requires 1-3. Which is correct? The frontend UI likely requires at least one category, so the API Worker's stricter validation is probably correct. Confirm with the user.

5. **URL validation**: Production accepts any `notebooklm.google*` hostname. The API Worker requires exact `notebooklm.google.com`. Which is correct? The API Worker's check is more precise. Confirm.

6. **Deployment**: Does the user have access to Cloudflare DNS/route configuration? Are there existing route patterns? This affects how easily Option C can be implemented.

7. **SEO routes**: Should `/sitemap.xml` and `/robots.txt` live in the Worker or Pages? Both work, but the Worker is cleaner since these are generated responses, not static files.

---

## Risks

- **Behavioral reconciliation**: The two implementations have drifted in 7+ areas. Unifying without fixing these drifts could introduce regressions in production. Each difference must be explicitly resolved.
- **Deployment migration**: Changing from Pages Function to separate Worker+Pages requires Cloudflare dashboard or API changes. If done incorrectly, could cause downtime.
- **Database binding**: Both configs point to the same D1 database (`notebooklm-marketplace`). Ensure the Worker deployment uses the correct database ID for production.
- **R2 and KV bindings**: Same concern — bindings must match production values.
- **Client-side routing**: The `/notebook/*` catch-all in `_worker.js` serves `notebook.html` for client-side routing. This must remain in Pages, not the Worker.
- **Turnstile**: The `TURNSTILE_SECRET` must be configured as a Worker secret, not just an environment variable.

---

## Ready for Proposal

**Yes** — the exploration is complete. The orchestrator should:

1. Present the three original options plus the new Option D to the user
2. Recommend Option C with rationale
3. Ask the open questions about CORS, IP hash, rate limits, and category validation
4. Proceed to `sdd-propose` once the user decides on an approach
