# Tasks — NotebookLM Marketplace

**Change:** `notebooklm-marketplace`
**Phase:** Tasks (implementation plan)
**PR constraint:** ≤400 lines per stacked PR
**Total estimated:** ~2000-2500 lines across 9 PRs

---

## PR 1: Project Scaffolding & Config
**~120 lines**

- Initialize `workers/api/` with `package.json` + `wrangler.toml`
- Create D1 database binding config
- Create R2 binding config
- Set up `frontend/` directory with placeholders
- `.gitignore` (node_modules, .wrangler, .env)
- Root `README.md` with project overview, setup instructions

**Dependencies:** None
**Risk:** Low

---

## PR 2: D1 Schema + Worker Router + CORS
**~250 lines**

- `workers/api/src/db/schema.js` — D1 schema SQL for all tables (notebooks, likes_log, submissions_log, notebooks_fts + triggers)
- `workers/api/src/index.js` — Entry point with itty-router setup
- `workers/api/src/middleware/cors.js` — CORS headers for all origins
- `workers/api/src/middleware/turnstile.js` — Cloudflare Turnpike token verification
- `workers/api/src/middleware/ratelimit.js` — IP-based rate limiter (submissions + likes)
- `workers/api/src/utils/ip.js` — IP hashing with SHA-256
- `workers/api/src/utils/validation.js` — Input validation functions

**Dependencies:** PR 1
**Risk:** Low, well-understood

---

## PR 3: Notebook Submit API
**~350 lines**

- `workers/api/src/handlers/submit.js` — POST /api/notebooks
  - Validate all fields
  - Verify Turnstile token
  - Check rate limit (3/hr/IP)
  - Handle image upload to R2
  - Insert into D1 + FTS
  - Return 201 with notebook ID
- Integration: middleware wired into submit handler

**Dependencies:** PR 2
**Risk:** Medium — image upload + R2 integration needs testing

---

## PR 4: List & Search API
**~350 lines**

- `workers/api/src/handlers/notebooks.js` — GET /api/notebooks
  - Pagination (page, limit)
  - Category filter
  - Tag filter
  - Full-text search via FTS5
  - Sort (recent / popular)
- `GET /api/notebooks/:id` — single notebook detail
- `GET /api/categories` — category list with counts
- `GET /api/tags/trending` — trending tags (most used in last 30 days)

**Dependencies:** PR 2
**Risk:** Low — mostly SQL queries

---

## PR 5: Likes API
**~200 lines**

- `workers/api/src/handlers/likes.js` — POST /api/notebooks/:id/like
  - Check if already liked (likes_log lookup)
  - Toggle: insert+increment or delete+decrement
  - Rate limit (100/hr/IP)
  - Return current count + liked status

**Dependencies:** PR 2
**Risk:** Low

---

## PR 6: Frontend - Discover Page
**~350 lines**

- `frontend/index.html` — Full discover page from mockup
  - NavBar with glass-blur effect + "Submit Notebook" CTA
  - Sidebar with categories (active state)
  - Trending tags section
  - Search bar with Ctrl+K shortcut
  - Notebook card grid (3 cols desktop, 2 tablet, 1 mobile)
  - "Load more" pagination button
  - Footer
- `frontend/css/style.css` — Shared styles (Tailwind + custom CSS)
- `frontend/js/home.js` — Fetch notebooks from API, render cards, search, pagination, sidebar category filter
- `frontend/js/config.js` — API base URL, constants

**Dependencies:** PR 4 (API must exist)
**Risk:** Medium — CSS polish + responsive layout from mockup

---

## PR 7: Frontend - Submit Page
**~250 lines**

- `frontend/submit.html` — Full submit form from mockup
  - Form fields: title, link, description, categories (multi-select chips), tags (free input), image upload (drag & drop)
  - Turnstile widget
  - Validation (client-side mirroring server rules)
  - Success state with "View my notebook" + "Submit another"
- `frontend/js/submit.js` — Form handling, API call, file upload, Turnstile integration

**Dependencies:** PR 3 (Submit API)
**Risk:** Low

---

## PR 8: Frontend - Detail Page
**~200 lines**

- `frontend/notebook.html` — Detail page from mockup
  - Back link to discover
  - Large preview image
  - Category badge + date
  - Full title + description
  - Tags
  - Sidebar: "Open in NotebookLM" button, Share button, like button
- `frontend/js/detail.js` — Fetch single notebook from API, render, like toggle, share functionality

**Dependencies:** PR 4 (Detail API)
**Risk:** Low

---

## PR 9: Frontend Polish + Deployment
**~250 lines**

- Mobile responsive navbar (hamburger menu for sidebar)
- 404 error page
- Loading states (skeleton loaders)
- Error states (API failure fallback)
- Empty state (no notebooks yet)
- GitHub Actions deploy workflow (`.github/workflows/deploy.yml`)
  - Frontend → Cloudflare Pages
  - Worker → Cloudflare Workers
  - D1 migrations
- Final README update with deployment instructions

**Dependencies:** All PRs
**Risk:** Low

---

## Dependency Graph

```
PR 1 (Scaffold)
  └─ PR 2 (Schema + Router + Middleware)
       ├─ PR 3 (Submit API)
       ├─ PR 4 (List/Search API)
       │    ├─ PR 6 (Discover Frontend)
       │    └─ PR 8 (Detail Frontend)
       └─ PR 5 (Likes API)
PR 3 ── PR 7 (Submit Frontend)
PR 9 (Polish + Deploy) ← all previous
```

## Review Workload Forecast

| PR | Est. Lines | Risk | Reviewer Focus |
|---|---|---|---|
| 1 | 120 | Low | Config correctness |
| 2 | 250 | Low | SQL schema + middleware |
| 3 | 350 | Medium | Image upload + security |
| 4 | 350 | Low | Search correctness |
| 5 | 200 | Low | Like toggle logic |
| 6 | 350 | Medium | CSS + mobile responsive |
| 7 | 250 | Low | Form validation |
| 8 | 200 | Low | Detail layout |
| 9 | 250 | Low | Deploy + polish |

**Total:** ~2320 lines | 9 PRs | All ≤400 lines ✅
