# SDD Delta Spec — NotebookLM Marketplace

**Change ID**: `notebooklm-marketplace`  
**Phase**: spec  
**Author**: SDD Spec Executor  
**Date**: 2026-06-07  
**Status**: draft  

---

## 1. Scope & Purpose

This document defines the detailed specification for the NotebookLM Marketplace MVP. It translates the approved proposal into RFC 2119 requirements (MUST, SHOULD, MAY) and Given/When/Then acceptance scenarios.  

**Key conventions:**
- The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).
- All API responses use `Content-Type: application/json` unless noted.
- All timestamps use ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ` in UTC).

---

## 2. Categories Taxonomy

### 2.1 Definition

The platform SHALL define exactly ten (10) categories. Each category has a `slug` (URL-safe identifier), a `name` (display label), and a `description`.

| # | Slug | Name | Description |
|---|---|---|---|
| 1 | `science` | Science | Research papers, scientific literature analysis, lab notes |
| 2 | `technology` | Technology | Software tools, IT infrastructure, tech product analysis |
| 3 | `medicine` | Medicine & Health | Medical research, clinical studies, wellness resources |
| 4 | `education` | Education | Study guides, course materials, learning resources, tutorials |
| 5 | `business` | Business & Finance | Strategy, operations, market analysis, investing |
| 6 | `arts` | Arts & Humanities | Writing, design, music, philosophy, literary analysis |
| 7 | `history` | History | Historical research, timelines, document analysis |
| 8 | `reference` | Reference | Encyclopedias, documentation, technical references, manuals |
| 9 | `productivity` | Productivity | PKM, workflow optimization, task management, note-taking |
| 10 | `other` | Other | Uncategorized notebooks that don't fit above |

### 2.2 Requirements

**REQ-CAT-1**: The taxonomy MUST be seeded in the D1 `categories` table at migration time.  
**REQ-CAT-2**: Each category MUST have a unique `slug` and unique `name`.  
**REQ-CAT-3**: The system MUST include an `other` category as a catch-all.  
**REQ-CAT-4**: The `GET /api/categories` endpoint MUST return the full list ordered by `id`.  
**REQ-CAT-5**: The system SHOULD allow adding new categories via D1 seed updates without code changes to the Worker.  
**REQ-CAT-6**: Category slugs MUST match `^[a-z]+(-[a-z]+)*$`.  
**REQ-CAT-7**: Category names MUST be 1–50 characters, alphabetic with spaces.  

### 2.3 GWT Scenarios

```gherkin
Scenario: Category list is accessible
  Given the application is deployed with seeded categories
  When a client sends GET /api/categories
  Then the response status MUST be 200
  And the response body MUST be a JSON array
  And the array MUST contain exactly 10 entries
  And each entry MUST have "id", "slug", "name", and "description" fields

Scenario: Category slugs are URL-safe
  Given the categories table is seeded
  When the system retrieves any category's slug
  Then the slug MUST match /^[a-z]+(-[a-z]+)*$/
  And the slug MUST NOT contain spaces or special characters

Scenario: Unknown category is rejected on submission
  Given a submission payload with category "invalid-category"
  When POST /api/submit is called
  Then the response status MUST be 422
  And the response MUST contain a validation error for the category field
```

---

## 3. Data Model — D1 Schema

### 3.1 Tables

#### 3.1.1 `categories`

```sql
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**REQ-DB-1**: The `categories` table MUST be created first in the migration (referenced by `notebooks`).  
**REQ-DB-2**: The `slug` column MUST have a UNIQUE constraint.  
**REQ-DB-3**: The `name` column MUST have a UNIQUE constraint.  

#### 3.1.2 `notebooks`

```sql
CREATE TABLE IF NOT EXISTS notebooks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT NOT NULL,
  share_url     TEXT NOT NULL,
  author_alias  TEXT DEFAULT NULL,
  category_id   INTEGER NOT NULL,
  tags          TEXT NOT NULL DEFAULT '[]',
  likes         INTEGER NOT NULL DEFAULT 0,
  is_stale      INTEGER NOT NULL DEFAULT 0,
  turnstile_token TEXT DEFAULT NULL,
  submitter_ip  TEXT DEFAULT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

**REQ-DB-4**: `title` MUST be 1–200 characters.  
**REQ-DB-5**: `slug` MUST be auto-generated from `title` and MUST be unique (append 4-char random suffix on collision).  
**REQ-DB-6**: `description` MUST be 1–2000 characters.  
**REQ-DB-7**: `share_url` MUST be a valid HTTPS URL with domain `notebooklm.google.com`.  
**REQ-DB-8**: `author_alias` is OPTIONAL (NULL allowed). If provided, MUST be 1–100 characters, no HTML.  
**REQ-DB-9**: `category_id` MUST reference a valid row in `categories`.  
**REQ-DB-10**: `tags` MUST be a JSON array of strings. Empty array `[]` is the default.  
**REQ-DB-11**: `likes` MUST be >= 0. Incremented atomically.  
**REQ-DB-12**: `is_stale` MUST be 0 (active) or 1 (stale/broken link). Default 0.  
**REQ-DB-13**: `turnstile_token` MAY be stored temporarily for auditing, then cleared after 24 hours.  
**REQ-DB-14**: `submitter_ip` MAY be stored for anti-abuse auditing, with a retention of 7 days.  
**REQ-DB-15**: `created_at` is the row-creation timestamp. `submitted_at` is the user-facing submission timestamp (same value on creation, but `created_at` is internal only).  

#### 3.1.3 `likes`

```sql
CREATE TABLE IF NOT EXISTS likes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  notebook_id INTEGER NOT NULL,
  ip_address  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(notebook_id, ip_address),
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);
```

**REQ-DB-16**: A UNIQUE constraint on `(notebook_id, ip_address)` MUST enforce one-like-per-IP-per-notebook.  
**REQ-DB-17**: `ip_address` MUST be stored as TEXT (IPv4 or IPv6).  

#### 3.1.4 `reports`

```sql
CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  notebook_id INTEGER NOT NULL,
  reporter_ip TEXT DEFAULT NULL,
  reason      TEXT DEFAULT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);
```

**REQ-DB-18**: `reason` is OPTIONAL. If provided, MUST be 1–500 characters.  

#### 3.1.5 Indexes (Performance)

```sql
CREATE INDEX IF NOT EXISTS idx_notebooks_category_id ON notebooks(category_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_created_at ON notebooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebooks_likes ON notebooks(likes DESC);
CREATE INDEX IF NOT EXISTS idx_likes_notebook_id ON likes(notebook_id);
```

### 3.2 Migration File

The initial migration SHALL be stored at `migrations/001_initial.sql` and SHALL contain all CREATE TABLE and CREATE INDEX statements above, wrapped in `IF NOT EXISTS` guards.

### 3.3 GWT Scenarios

```gherkin
Scenario: Notebook is persisted with correct defaults
  Given a valid submission payload
  When the submission is processed successfully
  Then a new row exists in the notebooks table
  And likes MUST be 0
  And is_stale MUST be 0
  And created_at MUST equal submitted_at
  And tags MUST be the JSON string "[]"
  And slug MUST NOT be NULL
  And slug MUST be unique across all rows

Scenario: Duplicate slug is handled
  Given a notebook with slug "my-notebook-abcd"
  When a second notebook with the same title is submitted
  Then the generated slug MUST differ from "my-notebook-abcd"
  And the insert MUST succeed (no UNIQUE violation)

Scenario: Like deduplication is enforced
  Given notebook with id=1 exists
  And IP 203.0.113.1 likes notebook 1
  When IP 203.0.113.1 tries to like notebook 1 again
  Then the likes counter MUST NOT increment
  And the response MUST indicate "already liked"

Scenario: Report is recorded
  Given notebook with id=1 exists
  When POST /api/notebooks/1/report is called with reason="broken link"
  Then a row exists in reports table with notebook_id=1
  And the response status MUST be 201
```

---

## 4. API Endpoints

### 4.1 Endpoint Table

| Method | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/categories` | List all categories | None |
| `GET` | `/api/notebooks` | List/search/filter notebooks | None |
| `GET` | `/api/notebooks/:id` | Get single notebook detail | None |
| `POST` | `/api/submit` | Submit a new notebook | Turnstile |
| `POST` | `/api/notebooks/:id/like` | Like (or unlike) a notebook | IP-based |
| `POST` | `/api/notebooks/:id/report` | Report a broken link | Turnstile |

### 4.2 GET /api/categories

**REQ-API-1**: Returns 200 with JSON array of category objects `{id, slug, name, description}`.  
**REQ-API-2**: Ordered by `id` ascending.  

### 4.3 GET /api/notebooks

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (1–50) |
| `category` | string | — | Filter by category slug |
| `search` | string | — | Full-text search against title, description, tags |
| `tag` | string | — | Filter by exact tag match |
| `sort` | string | `created_at` | Sort field: `created_at`, `likes`, `title` |
| `order` | string | `desc` | Sort direction: `asc`, `desc` |

**REQ-API-3**: Returns 200 with JSON object:  
```json
{
  "data": [{ "id": 1, "title": "...", "slug": "...", "description": "...", "share_url": "...", "category": {...}, "tags": [...], "likes": 5, "created_at": "...", "submitted_at": "..." }],
  "pagination": { "page": 1, "limit": 20, "total": 42, "total_pages": 3 }
}
```
**REQ-API-4**: Each notebook object MUST include a nested `category` object `{id, slug, name}` (not just the foreign key).  
**REQ-API-5**: The `description` field in list responses SHOULD be truncated to 150 characters with ellipsis.  
**REQ-API-6**: `search` MUST perform a case-insensitive `LIKE` match across `title`, `description`, and the parsed `tags` JSON array.  
**REQ-API-7**: `category` filter MUST match on `categories.slug` (not id).  
**REQ-API-8**: `tag` filter MUST check for exact match within the `tags` JSON array.  
**REQ-API-9**: `page` values less than 1 MUST be treated as 1.  
**REQ-API-10**: `limit` values outside 1–50 MUST be clamped to the nearest boundary.  
**REQ-API-11**: Results MUST NOT include stale notebooks (`is_stale = 0`) by default. A `?include_stale=1` param MAY be added later.  

### 4.4 GET /api/notebooks/:id

**REQ-API-12**: Returns 200 with the full notebook object (description not truncated).  
**REQ-API-13**: Returns 404 if `:id` does not exist.  
**REQ-API-14**: The response includes `{..., "is_stale": 0|1, "category": {...}, "tags": [...], "likes": N}`.  

### 4.5 POST /api/submit

**Request Body** (JSON):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | YES | 1–200 chars, no HTML tags |
| `description` | string | YES | 1–2000 chars, no HTML tags |
| `share_url` | string | YES | Must be `https://notebooklm.google.com/...` |
| `category` | string | YES | Must match a valid category slug |
| `tags` | string[] | NO | Max 10 tags, each 1–50 chars, `^[a-zA-Z0-9 ]+$` |
| `author_alias` | string | NO | 1–100 chars if provided, no HTML |
| `cf-turnstile-response` | string | YES | Turnstile widget token |

**REQ-API-15**: Returns 201 with `{ "id": N, "slug": "...", "share_url": "..." }` on success.  
**REQ-API-16**: Returns 422 with `{ "error": "...", "fields": {...} }` on validation failure.  
**REQ-API-17**: Returns 429 with `{ "error": "rate_limit_exceeded" }` if IP rate limit is hit.  
**REQ-API-18**: On success, a new row MUST be inserted into `notebooks` and the `likes` counter starts at 0.  
**REQ-API-19**: The `share_url` MUST be stored as-is after validation (no redirect following).  

### 4.6 POST /api/notebooks/:id/like

**Request Body**: None (empty body or `{}`).  

**Response Cases:**

| Condition | Status | Body |
|---|---|---|
| Notebook exists, IP hasn't liked | 200 | `{ "likes": N, "liked": true }` |
| Notebook exists, IP already liked | 200 | `{ "likes": N, "liked": false, "message": "already liked" }` |
| Notebook does not exist | 404 | `{ "error": "not_found" }` |

**REQ-API-20**: The `likes` counter in `notebooks` MUST be incremented atomically when a new like is recorded.  
**REQ-API-21**: The UNIQUE constraint on `(notebook_id, ip_address)` MUST prevent duplicate likes.  
**REQ-API-22**: The endpoint MUST record the IP address from `request.headers.get('CF-Connecting-IP')` or `X-Forwarded-For`.  

### 4.7 POST /api/notebooks/:id/report

**Request Body** (JSON):

| Field | Type | Required | Constraints |
|---|---|---|---|
| `reason` | string | NO | 1–500 chars if provided, no HTML |
| `cf-turnstile-response` | string | YES | Turnstile widget token |

**REQ-API-23**: Returns 201 with `{ "id": N }` on success.  
**REQ-API-24**: Returns 404 if notebook does not exist.  
**REQ-API-25**: Returns 429 if IP rate limit is exceeded.  

### 4.8 GWT Scenarios

```gherkin
Scenario: Submit a valid notebook
  Given a valid Turnstile token
  And a payload with valid title, description, share_url (notebooklm.google.com domain), and category
  When POST /api/submit is called
  Then the response status MUST be 201
  And the response body MUST contain "id" and "slug"
  And the share_url stored in the database MUST match the input

Scenario: Submit with invalid domain is rejected
  Given a payload where share_url = "https://evil.com/phishing"
  When POST /api/submit is called
  Then the response status MUST be 422
  And the response MUST contain a field-level error for "share_url"

Scenario: Submit with missing required fields is rejected
  Given a payload with only title and share_url (missing description)
  When POST /api/submit is called
  Then the response status MUST be 422
  And the response MUST contain field-level errors for each missing required field

Scenario: Submit with HTML tags is sanitized
  Given a payload where title = "<script>alert('xss')</script>My Notebook"
  When POST /api/submit is called
  Then the stored title MUST be "My Notebook" (tags stripped)
  And the response status MUST be 201

Scenario: Submit with invalid Turnstile token is rejected
  Given a payload with cf-turnstile-response = "fake-token"
  When POST /api/submit is called
  Then the response status MUST be 403
  And the response MUST contain an error about failed verification

Scenario: List notebooks with category filter
  Given 5 notebooks in "Science" and 3 in "Technology"
  When GET /api/notebooks?category=science is called
  Then the response MUST contain exactly 5 items
  And each item's category.slug MUST be "science"

Scenario: Search notebooks by keyword
  Given a notebook with title "Quantum Mechanics Overview"
  When GET /api/notebooks?search=quantum is called
  Then the response MUST include the matching notebook
  And the search MUST be case-insensitive

Scenario: Like a notebook once
  Given notebook with id=1 exists
  When IP 203.0.113.1 sends POST /api/notebooks/1/like
  Then the response status MUST be 200
  And likes MUST be 1
  And liked MUST be true

Scenario: Like a notebook twice from same IP
  Given notebook with id=1 exists and already liked by IP 203.0.113.1
  When IP 203.0.113.1 sends POST /api/notebooks/1/like again
  Then the response status MUST be 200
  And likes MUST still be 1
  And liked MUST be false
  And message MUST indicate "already liked"

Scenario: Get notebook detail
  Given notebook with id=1 exists
  When GET /api/notebooks/1 is called
  Then the response status MUST be 200
  And the response MUST contain all fields: id, title, slug, description, share_url, category, tags, likes, is_stale, created_at, submitted_at

Scenario: Report a broken link
  Given notebook with id=1 exists
  And a valid Turnstile token
  When POST /api/notebooks/1/report with reason="Link returns 404"
  Then the response status MUST be 201
  And a report record exists for notebook_id=1

Scenario: Pagination works correctly
  Given 25 notebooks exist
  When GET /api/notebooks?page=2&limit=10 is called
  Then the response MUST return 10 items
  And pagination.total MUST be 25
  And pagination.total_pages MUST be 3
  And pagination.page MUST be 2

Scenario: Rate limit exceeded on submit
  Given an IP that has submitted 5 notebooks in the last hour
  When that IP submits another notebook
  Then the response status MUST be 429
  And the error MUST indicate rate_limit_exceeded
```

---

## 5. Validation Rules

### 5.1 Field-Level Validation

| Field | Rules | Error Code |
|---|---|---|
| `title` | REQUIRED. 1–200 chars after stripping HTML tags. Strip leading/trailing whitespace. | `title_required`, `title_too_long` |
| `description` | REQUIRED. 1–2000 chars after stripping HTML tags. Strip leading/trailing whitespace. | `description_required`, `description_too_long` |
| `share_url` | REQUIRED. MUST be a valid URL. MUST start with `https://notebooklm.google.com/`. MUST use HTTPS. MUST NOT contain fragments (`#`). | `share_url_required`, `share_url_invalid`, `share_url_domain` |
| `category` | REQUIRED. MUST match an existing category slug (case-insensitive lookup, store canonical slug). | `category_required`, `category_invalid` |
| `tags` | OPTIONAL. If provided, MUST be a JSON array of 0–10 strings. Each string MUST be 1–50 chars. Each string MUST match `^[a-zA-Z0-9 ]+$`. Duplicate tags MUST be removed server-side. | `tags_invalid`, `tags_too_many`, `tag_too_long`, `tag_invalid_chars` |
| `author_alias` | OPTIONAL. If provided, MUST be 1–100 chars after stripping HTML. | `author_alias_too_long` |
| `reason` | OPTIONAL (report). If provided, MUST be 1–500 chars after stripping HTML. | `reason_too_long` |

### 5.2 Sanitization Rules

**REQ-VAL-1**: All string fields MUST have HTML tags stripped server-side using a tag-stripping function (e.g., regex `/<[^>]*>/g` or a dedicated sanitizer).  
**REQ-VAL-2**: All string fields MUST be trimmed of leading/trailing whitespace.  
**REQ-VAL-3**: `share_url` MUST be normalized (lowercase hostname, preserve path and query).  
**REQ-VAL-4**: NULL bytes and control characters (0x00–0x1F, except 0x0A line feed) MUST be rejected or stripped.  
**REQ-VAL-5**: Maximum request body size MUST be 10 KB. Larger bodies MUST be rejected with 413.  

### 5.3 Business Validation

**REQ-VAL-6**: The `share_url` domain MUST exactly match `notebooklm.google.com` (subdomains like `sub.notebooklm.google.com` are NOT allowed).  
**REQ-VAL-7**: The system MUST NOT follow redirects on the `share_url` — domain validation is static only.  
**REQ-VAL-8**: Duplicate `share_url` submissions from different IPs MAY be allowed (same notebook shared by multiple people).  

### 5.4 GWT Scenarios

```gherkin
Scenario: Title with only whitespace is rejected
  Given a payload with title = "   "
  When POST /api/submit is called
  Then the response status MUST be 422
  And the error MUST indicate title_required

Scenario: Tags with invalid characters are rejected
  Given a payload with tags = ["tag<script>"]
  When POST /api/submit is called
  Then the response status MUST be 422
  And the error MUST indicate tag_invalid_chars

Scenario: Too many tags are rejected
  Given a payload with 15 tags
  When POST /api/submit is called
  Then the response status MUST be 422
  And the error MUST indicate tags_too_many

Scenario: Duplicate tags are deduplicated server-side
  Given a payload with tags = ["science", "physics", "science"]
  When POST /api/submit is called successfully
  Then the stored tags MUST be ["science", "physics"]

Scenario: Request body over 10KB is rejected
  Given a payload with a 12KB description
  When POST /api/submit is called
  Then the response status MUST be 413
```

---

## 6. Anti-Abuse

### 6.1 Turnstile Integration

**REQ-AA-1**: All `POST /api/submit` and `POST /api/notebooks/:id/report` requests MUST include a `cf-turnstile-response` field in the request body.  
**REQ-AA-2**: The Worker MUST verify the token by making a POST request to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, and `remoteip`.  
**REQ-AA-3**: If the Turnstile verification fails (response `success: false`), the endpoint MUST return **403 Forbidden** with `{ "error": "turnstile_verification_failed" }`.  
**REQ-AA-4**: Turnstile site key and secret key MUST be configured via Worker environment variables (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`).  
**REQ-AA-5**: The Turnstile widget MUST be rendered on the submission form with `data-theme="light"` and `data-size="invisible"` (invisible CAPTCHA).  

### 6.2 IP Rate Limiting

**REQ-AA-6**: The Worker MUST enforce IP-based rate limits using an in-memory Map (per-worker, reset on cold start) or Cloudflare KV if available.  

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/submit` | 5 requests per IP | 1 hour (sliding window) |
| `POST /api/notebooks/:id/like` | 100 requests per IP | 1 hour (sliding window) |
| `POST /api/notebooks/:id/report` | 10 requests per IP | 1 hour (sliding window) |
| `GET /api/*` | 1000 requests per IP | 1 hour (sliding window, optional) |

**REQ-AA-7**: The rate limiter MUST use the `CF-Connecting-IP` header for IP detection, falling back to `X-Forwarded-For` then `request.ip`.  
**REQ-AA-8**: When a rate limit is exceeded, the endpoint MUST return **429 Too Many Requests** with `{ "error": "rate_limit_exceeded", "retry_after": N }` where `N` is seconds remaining in the window.  
**REQ-AA-9**: The rate limiter SHOULD include a `Retry-After` header in 429 responses.  
**REQ-AA-10**: Rate limit state MAY be stored in Cloudflare KV for persistence across Worker instances. For MVP, in-memory Map is ACCEPTABLE with the understanding limits reset on cold starts.  

### 6.3 Abuse Monitoring (Logging)

**REQ-AA-11**: The Worker MAY log blocked requests (rate limit hits, Turnstile failures) to `console.log` for Workers Analytics observation.  
**REQ-AA-12**: `submitter_ip` in the `notebooks` table and `reporter_ip` in the `reports` table MUST be retained for no more than 7 days, after which they SHOULD be anonymized or deleted.  

### 6.4 GWT Scenarios

```gherkin
Scenario: Missing Turnstile token on submit
  Given a payload without cf-turnstile-response
  When POST /api/submit is called
  Then the response status MUST be 403
  And the error MUST indicate turnstile_verification_failed

Scenario: Rate limit hit on submission
  Given an IP that has made 5 submissions in the last hour
  When that IP sends one more POST /api/submit
  Then the response status MUST be 429
  And the response MUST contain "retry_after"
  And the response MUST include a Retry-After header

Scenario: Like endpoint respects rate limit
  Given an IP that has liked 100 notebooks in the last hour
  When that IP sends POST /api/notebooks/1/like
  Then the response status MUST be 429

Scenario: GET endpoints are not strictly rate-limited (informational)
  Given an IP making rapid GET /api/notebooks requests
  When the rate exceeds 1000/hour
  Then the system MAY return 429
  But the primary rate limit concern is on mutation endpoints
```

---

## 7. Slug Generation Algorithm

**REQ-SLUG-1**: The slug MUST be generated from the `title` using the following algorithm:

```
1. Convert title to lowercase
2. Replace any sequence of non-alphanumeric characters (except hyphens) with a single hyphen
3. Remove leading and trailing hyphens
4. Truncate to 80 characters
5. If the resulting slug is empty, use "notebook" as base
6. Append a 4-character random alphanumeric suffix (e.g., "-a3f8")
7. Check uniqueness in the `notebooks` table
8. If collision occurs, regenerate the 4-char suffix (up to 5 attempts)
9. After 5 collisions, append a 6-character random suffix
```

**REQ-SLUG-2**: The slug MUST be unique; UNIQUE constraint on the column enforces this at the database level.  
**REQ-SLUG-3**: The slug MUST match `^[a-z0-9]+(-[a-z0-9]+)*(-[a-z0-9]{4,6})?$`.  

---

## 8. Stale Link Detection

**REQ-STALE-1**: A cron trigger (or on-demand endpoint) SHOULD run daily to check notebooks where `is_stale = 0`.  
**REQ-STALE-2**: The check MUST issue an HTTP HEAD request to `share_url`.  
**REQ-STALE-3**: If the response status is 4xx or 5xx (or the request times out after 10 seconds), the notebook MUST be marked `is_stale = 1`.  
**REQ-STALE-4**: If the response status is 2xx or 3xx, `is_stale` MUST remain 0.  
**REQ-STALE-5**: The stale check endpoint (`GET /api/check-link`) SHOULD be idempotent and NOT externally exposed in production.  
**REQ-STALE-6**: Stale notebooks MUST be excluded from default browse lists (`is_stale = 0` filter).  

---

## 9. Error Response Format

All error responses SHALL use this envelope:

```json
{
  "error": "error_code_string",
  "message": "Human-readable description",
  "fields": {
    "field_name": "Specific field error message"
  }
}
```

**REQ-ERR-1**: The `fields` object is OPTIONAL and only present for 422 validation errors.  
**REQ-ERR-2**: All 500-level errors MUST return `{ "error": "internal_error", "message": "An unexpected error occurred" }` — no stack traces exposed.  

---

## 10. Security Requirements

**REQ-SEC-1**: All API responses MUST include `X-Content-Type-Options: nosniff`.  
**REQ-SEC-2**: All API responses MUST include `X-Frame-Options: DENY`.  
**REQ-SEC-3**: The Worker MUST NOT expose internal request details (stack traces, SQL errors, environment variable names) in error responses.  
**REQ-SEC-4**: Input validation MUST happen server-side; client-side validation is UX-only and MUST NOT be relied upon for security.  
**REQ-SEC-5**: The `categories` table seed data MUST be part of the migration, not loaded from external files.  

---

## 11. File Artifacts

The following files SHALL be created or modified as part of this change:

| File | Status | Purpose |
|---|---|---|
| `migrations/001_initial.sql` | NEW | D1 schema migration (all tables + indexes) |
| `src/lib/db.js` | NEW | D1 client helpers (query builder, prepared statements) |
| `src/lib/validation.js` | NEW | Input validation and sanitization functions |
| `src/lib/turnstile.js` | NEW | Turnstile token verification helper |
| `src/lib/slug.js` | NEW | URL slug generation from title |
| `src/lib/rate-limit.js` | NEW | IP-based rate limiter (in-memory or KV) |
| `src/index.js` | NEW | Worker entry point with router |
| `src/api/notebooks.js` | NEW | GET/POST handlers for notebooks |
| `src/api/likes.js` | NEW | Like toggle handler |
| `src/api/reports.js` | NEW | Report broken link handler |
| `src/api/categories.js` | NEW | Categories list handler |
| `src/static/index.html` | NEW | Browse/discover page |
| `src/static/submit.html` | NEW | Submission form with Turnstile |
| `src/static/notebook-detail.html` | NEW | Notebook detail page template |
| `src/static/css/tailwind.css` | NEW | Tailwind CSS (CDN or built) |
| `src/static/js/main.js` | NEW | Client-side fetch/rendering logic |
| `wrangler.toml` | NEW | Worker configuration, D1 binding, env vars |
| `package.json` | NEW | Dependencies (for Tailwind build if not CDN) |
| `.env.example` | NEW | Template for Turnstile keys and env vars |
| `.gitignore` | MODIFY | Add `node_modules/`, `.env`, `dist/` |
| `README.md` | NEW | Setup and deployment instructions |

---

## 12. Open Questions (Deferred Decisions)

These should be resolved during the design/tasks phase:

1. **KV vs in-memory for rate limiting**: In-memory Map is simpler for MVP but resets on Worker cold starts. KV adds cost/complexity. Default: in-memory with documented limitation.
2. **CDN Tailwind vs built**: CDN avoids build step but adds external dependency. Default: CDN for MVP, switch to built CSS if performance is an issue.
3. **Stale link cron**: Cloudflare Workers cron triggers are available on paid plans. For free tier, stale checking could be triggered on notebook detail page view. Default: on-demand check when viewing detail page.
4. **Retention policy automation**: Purging `submitter_ip` after 7 days requires a cron job. Default: manual SQL cleanup for MVP, document the requirement.

---

*End of SDD Delta Spec. Ready for review before proceeding to design phase.*
