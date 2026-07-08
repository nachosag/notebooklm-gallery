# Drift Decision Audit — `unify-workers`

This table enumerates the 7 behavioral drifts between `frontend/_worker.js` (production, untested) and `workers/api/src/` (tested, not deployed). Each drift has a recommended winner with rationale. **All require explicit user decision** before specs are finalized (except #1 which the user already confirmed, and the SITE_URL bug which is in-scope as bug #166).

| # | Drift | Production (`_worker.js`) | Tested (`workers/api/src/`) | Recommended Winner | Rationale | Status |
|---|-------|---------------------------|----------------------------|--------------------|-----------|--------|
| 1 | **CORS policy** | Wildcard `*` | Allow-list: `["https://notebooklm-gallery.pages.dev", "http://localhost:8787"]` | **Tested (allow-list)** | Wildcard is a security risk. Allow-list restricts to known origins. User already confirmed this is correct. | ✅ **Decided**: allow-list wins |
| 2 | **IP hash salt** | `ip + "notebooklm-gallery-salt"` | Bare `ip` (no salt) | **Tested (no salt)** | IP hashes are for rate-limiting, not security. Salt adds complexity without meaningful benefit here. The existing salt is hardcoded in source (public), so it does not provide defense in depth. Existing `likes_log` data uses unsalted hashes. | ✅ **Decided**: no salt (tested wins) |
| 3 | **Like rate limit** | 30/hour | 100/hour | **Production (30/hour)** | More conservative, protects against abuse. Production value has been live and stable. Tested value was never deployed. User confirmed 30/h. | ✅ **Decided**: 30/hour (production wins) |
| 4 | **Validation strictness** | Lenient: `*.notebooklm.google` (any subdomain), no protocol check, categories optional, error fields as array | Strict: exact `notebooklm.google.com`, https required, 1-3 categories required, error fields as object | **Hybrid: strict hostname + lenient categories** | Strict hostname prevents malicious URL injection (`*.notebooklm.google` is too permissive — a subdomain takeover could exploit it). Lenient categories preserves current production UX (UI may or may not require categories). Error format follows tested (object). | ✅ **Decided**: hybrid (strict hostname, lenient categories) |
| 5 | **Like existence check** | No check — silently inserts/deletes even for non-existent notebooks | 404 if notebook doesn't exist | **Tested (404)** | Prevents orphaned `likes_log` entries and data corruption. Proper validation. | ✅ **Decided**: 404 (tested wins) |
| 6 | **Image R2 error handling** | 400 hard fail — entire submission fails if R2 is down | 400 for validation errors only; R2 failure is non-fatal (log + continue without image) | **Tested (non-fatal)** | Graceful degradation. R2 temporary outage shouldn't block notebook submission. Image is optional. | ✅ **Decided**: non-fatal (tested wins) |
| 7 | **FTS5 category filter** | JS string concat: `query += " AND n.categories LIKE ?2"` with `params.push(`%"${category}"%`)` | D1 `||` concat: `AND n.categories LIKE '%' || ?2 || '%'` | **Tested (D1 concat)** | D1-side concatenation is cleaner, avoids JS string building, and is less error-prone. Functionally equivalent. | ✅ **Decided**: D1 concat (tested wins) |

## Additional Bug (In-Scope)

**Bug #166 — SITE_URL wrong domain**: `workers/api/src/handlers/seo.js` L5 has `const SITE_URL = "https://notebooklm.gallery"` — that domain does not exist. MUST be changed to `const SITE_URL = "https://notebooklm-gallery.pages.dev"`. This is in-scope for this change. Test assertion: every `<loc>` in emitted sitemap.xml MUST start with `https://notebooklm-gallery.pages.dev/`.

## Decision Status

All 7 drifts decided by the user (case-by-case). Spec bodies for `api-likes` and `api-submit` have been updated to reflect drift #3 (30/h) and drift #4 (hybrid). The remaining drifts either matched the recommended winner (so no body change needed) or only affected the drift audit itself.
