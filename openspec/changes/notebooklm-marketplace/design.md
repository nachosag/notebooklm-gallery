# Design — NotebookLM Marketplace

**Change:** `notebooklm-marketplace`
**Phase:** Design
**Based on:** Spec v1

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare Pages                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │index.html│  │submit/   │  │notebook/[id]/    │   │
│  │(Discover)│  │index.html│  │index.html        │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│         │              │               │             │
│         ▼              ▼               ▼             │
│  ┌──────────────────────────────────────────────┐    │
│  │         Static Assets (CSS/JS/img)           │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS (API calls)
                       ▼
┌─────────────────────────────────────────────────────┐
│                Cloudflare Workers                     │
│  ┌────────────────────────────────────────────────┐  │
│  │              API Router (itty-router)           │  │
│  │  GET  /api/notebooks        → list             │  │
│  │  GET  /api/notebooks/:id   → detail            │  │
│  │  POST /api/notebooks       → submit            │  │
│  │  POST /api/notebooks/:id/like → toggle like    │  │
│  │  GET  /api/categories      → categories        │  │
│  │  GET  /api/tags/trending   → trending tags     │  │
│  └────────────────────────────────────────────────┘  │
│                       │                               │
│                       ▼                               │
│  ┌────────────────────────────────────────────────┐  │
│  │              Services Layer                      │  │
│  │  - NotebookService (CRUD + search)              │  │
│  │  - LikeService (toggle + rate limit check)      │  │
│  │  - SubmissionService (validate + store + R2)    │  │
│  │  - TurnstileService (verify token)               │  │
│  └────────────────────────────────────────────────┘  │
│                       │                               │
│                       ▼                               │
│  ┌─────────────────────┐  ┌────────────────────┐     │
│  │    D1 Database      │  │  R2 Object Store   │     │
│  │  - notebooks        │  │  - preview-images/ │     │
│  │  - likes_log        │  │                    │     │
│  │  - submissions_log  │  │                    │     │
│  │  - notebooks_fts    │  │                    │     │
│  └─────────────────────┘  └────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### Stack
- **Framework**: Plain HTML + Tailwind CSS (CDN for dev, built for prod)
- **JS**: Vanilla JavaScript (no framework — keeps bundle tiny, zero cost)
- **SPA-lite**: Multi-page app with client-side routing via History API for smooth transitions

### Pages (consolidated to SPA if trivial, or static multi-page)

Given the simplicity, we use **multi-page static HTML** served by Cloudflare Pages:

| Route | HTML | JS |
|---|---|---|
| `/` | `index.html` | `home.js` |
| `/notebook/:id` | `notebook.html` | `detail.js` |
| `/submit` | `submit.html` | `submit.js` |

Each page loads shared CSS from `style.css` and shared config from `config.js`.

### State Management
- No framework — use `<script>` modules with IIFE pattern
- API calls via `fetch()` to Worker endpoint
- Likes stored in `localStorage` for deduplication (display)
- Server is source of truth for like count

### Key Components (from mockups)
- **TopNavBar**: Fixed, glass-blur effect, brand name + nav links + Submit CTA
- **Sidebar**: Categories list with icons (active state), trending tags
- **SearchBar**: Full-width with Ctrl+K shortcut
- **NotebookCard**: Thumbnail (16:9), category badge, title (2-line clamp), description (2-line clamp), like button
- **Detail**: Back link, large preview, description, tags, "Open in NotebookLM" button, Share button
- **SubmitForm**: Sheet layout (max 640px), Title/Link/Description/Image/Categories/Tags, validation, success state

### Responsive Breakpoints
| Breakpoint | Columns | Sidebar |
|---|---|---|
| < 768px (mobile) | 1 | Hidden (off-screen drawer or above fold) |
| 768-1024px (tablet) | 2 | Collapsed (hamburger) |
| > 1024px (desktop) | 3 | Visible (sticky) |

---

## 3. Backend Architecture (Workers)

### Structure

```
workers/api/
├── src/
│   ├── index.js          # Entry point + router
│   ├── db/
│   │   └── schema.js     # D1 schema setup
│   ├── handlers/
│   │   ├── notebooks.js  # GET /notebooks, GET /notebooks/:id
│   │   ├── submit.js     # POST /notebooks
│   │   ├── likes.js      # POST /notebooks/:id/like
│   │   └── metadata.js   # GET /categories, GET /tags/trending
│   ├── middleware/
│   │   ├── ratelimit.js  # IP-based rate limiting
│   │   ├── turnstile.js  # Turnstile verification
│   │   └── cors.js       # CORS headers
│   └── utils/
│       ├── validation.js # Input validation
│       └── ip.js         # IP hashing (SHA-256)
├── wrangler.toml
└── package.json
```

### D1 Queries (key examples)

**List notebooks:**
```sql
SELECT id, title, substr(description, 1, 200) as description,
       share_url, categories, tags, preview_url, likes, created_at
FROM notebooks
WHERE (?1 IS NULL OR categories LIKE '%' || ?1 || '%')
  AND (?2 IS NULL OR tags LIKE '%' || ?2 || '%')
ORDER BY CASE WHEN ?3 = 'popular' THEN likes ELSE 0 END DESC,
         created_at DESC
LIMIT ?4 OFFSET ?5
```

**Full-text search:**
```sql
SELECT n.id, n.title, n.description, n.share_url,
       n.categories, n.tags, n.preview_url, n.likes, n.created_at
FROM notebooks n
JOIN notebooks_fts fts ON n.rowid = fts.rowid
WHERE notebooks_fts MATCH ?1
ORDER BY rank
LIMIT ?2 OFFSET ?3
```

### Like Toggle (idempotent)

```sql
-- Check if already liked
SELECT 1 FROM likes_log WHERE notebook_id = ?1 AND ip_hash = ?2

-- If not liked: insert + increment
INSERT INTO likes_log(notebook_id, ip_hash) VALUES (?1, ?2);
UPDATE notebooks SET likes = likes + 1 WHERE id = ?1;

-- If already liked: remove + decrement (unlike)
DELETE FROM likes_log WHERE notebook_id = ?1 AND ip_hash = ?2;
UPDATE notebooks SET likes = likes - 1 WHERE id = ?1 AND likes > 0;
```

### Rate Limiting

```sql
-- Submissions: count in last hour
SELECT COUNT(*) FROM submissions_log
WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')
-- Max 3/hr

-- Likes: count in last hour
SELECT COUNT(*) FROM likes_log
WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')
-- Max 100/hr
```

---

## 4. Image Upload (R2)

- Images uploaded directly to Workers, which stream to R2
- Resize to max 1200px width (maintain aspect ratio) using Cloudflare's built-in image resizing (if available) or passthrough
- Store as `preview-images/{uuid}.{ext}`
- Return public URL with R2 public bucket access or signed URL
- **Limitation**: R2 free tier is 10GB storage + 1M Class A ops/month — sufficient for MVP

---

## 5. Deployment

### Wrangler Configuration

```toml
# wrangler.toml (project root)
name = "notebooklm-marketplace-api"
main = "workers/api/src/index.js"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "notebooklm-marketplace"
database_id = "..."

[[r2_buckets]]
binding = "PREVIEW_IMAGES"
bucket_name = "notebooklm-marketplace-previews"

[env.production]
vars = { ENVIRONMENT = "production" }

[env.production.d1_databases]
binding = "DB"
database_name = "notebooklm-marketplace"
database_id = "..."

[env.production.r2_buckets]
binding = "PREVIEW_IMAGES"
bucket_name = "notebooklm-marketplace-previews"
```

### CI/CD (GitHub Actions)

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: deploy
```

### Frontend Deployment

Cloudflare Pages connects to the GitHub repo:
- Build command: `npm run build` (if any processing)
- Output dir: `frontend/`
- Auto-deploys on push to main

---

## 6. Project Directory Structure

```
notebooklm-marketplace/
├── openspec/                          # SDD artifacts
│   ├── config.yaml
│   └── changes/
│       └── notebooklm-marketplace/
│           ├── explore.md
│           ├── proposal.md
│           ├── spec.md
│           └── design.md
├── stitch-notebooklm-asset-marketplace/  # Design mockups (reference)
├── frontend/                          # Cloudflare Pages site
│   ├── index.html                     # Discover page
│   ├── submit.html                    # Submit form
│   ├── notebook.html                  # Detail page
│   ├── css/
│   │   └── style.css                  # Tailwind + custom styles
│   └── js/
│       ├── home.js                    # Discover page logic
│       ├── detail.js                  # Detail page logic
│       ├── submit.js                  # Submit form logic
│       └── config.js                  # API URL, constants
├── workers/                           # Cloudflare Workers
│   └── api/
│       ├── src/
│       │   ├── index.js
│       │   ├── db/
│       │   │   └── schema.js
│       │   ├── handlers/
│       │   │   ├── notebooks.js
│       │   │   ├── submit.js
│       │   │   ├── likes.js
│       │   │   └── metadata.js
│       │   ├── middleware/
│       │   │   ├── ratelimit.js
│       │   │   ├── turnstile.js
│       │   │   └── cors.js
│       │   └── utils/
│       │       ├── validation.js
│       │       └── ip.js
│       ├── wrangler.toml
│       └── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .gitignore
└── README.md
```
