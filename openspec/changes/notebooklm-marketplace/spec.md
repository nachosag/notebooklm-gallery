# Spec — NotebookLM Marketplace

**Change:** `notebooklm-marketplace`
**Phase:** Spec (delta)
**Based on:** Proposal v1

---

## 1. Categories Taxonomy

Fixed category list (taxonomy, not extensible by users):

| # | Category | Icon (Material Symbol) | Description |
|---|---|---|---|
| 1 | Education | `school` | Study guides, courses, academic topics |
| 2 | Technology | `memory` | LLMs, coding, software, hardware |
| 3 | Research | `science` | Scientific papers, literature reviews |
| 4 | Creative | `palette` | Writing, worldbuilding, art, music |
| 5 | Business | `business_center` | Startups, finance, marketing, strategy |
| 6 | Health & Medicine | `ecg_heart` | Medical research, wellness, neuroscience |
| 7 | Productivity | `checklist` | PKM, workflows, note-taking systems |
| 8 | History & Humanities | `history` | History, philosophy, sociology |
| 9 | Reference | `menu_book` | Encyclopedias, guides, knowledge bases |
| 10 | Other | `category` | Anything that doesn't fit above |

Users select **one or more** categories when submitting (multi-select chips, max 3).

---

## 2. Data Model (D1 / SQLite)

### Table: `notebooks`

```sql
CREATE TABLE notebooks (
  id          TEXT PRIMARY KEY,           -- UUID v4
  title       TEXT NOT NULL,              -- 3-120 chars
  description TEXT NOT NULL,              -- 20-1000 chars
  share_url   TEXT NOT NULL UNIQUE,       -- must match notebooklm.google.com domain
  categories  TEXT NOT NULL,              -- JSON array of category slugs, e.g. ["education","technology"]
  tags        TEXT NOT NULL DEFAULT '[]', -- JSON array of free-form tags, e.g. ["quantum","physics"]
  preview_url TEXT,                       -- R2 image URL, nullable
  likes       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')), -- ISO 8601
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash     TEXT                        -- SHA256 of submitter IP (for rate limiting, not displayed)
);

-- Indexes
CREATE INDEX idx_notebooks_categories ON notebooks(categories);
CREATE INDEX idx_notebooks_likes ON notebooks(likes DESC);
CREATE INDEX idx_notebooks_created ON notebooks(created_at DESC);

-- Full-text search virtual table
CREATE VIRTUAL TABLE notebooks_fts USING fts5(
  title, description, tags,
  content='notebooks',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER notebooks_ai AFTER INSERT ON notebooks BEGIN
  INSERT INTO notebooks_fts(rowid, title, description, tags)
  VALUES (new.rowid, new.title, new.description, new.tags);
END;

CREATE TRIGGER notebooks_ad AFTER DELETE ON notebooks BEGIN
  INSERT INTO notebooks_fts(notebooks_fts, rowid, title, description, tags)
  VALUES ('delete', old.rowid, old.title, old.description, old.tags);
END;

CREATE TRIGGER notebooks_au AFTER UPDATE ON notebooks BEGIN
  INSERT INTO notebooks_fts(notebooks_fts, rowid, title, description, tags)
  VALUES ('delete', old.rowid, old.title, old.description, old.tags);
  INSERT INTO notebooks_fts(rowid, title, description, tags)
  VALUES (new.rowid, new.title, new.description, new.tags);
END;
```

### Table: `likes_log` (for abuse prevention)

```sql
CREATE TABLE likes_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  notebook_id TEXT NOT NULL REFERENCES notebooks(id),
  ip_hash     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(notebook_id, ip_hash)  -- one like per IP per notebook
);
```

### Table: `submissions_log` (rate limiting)

```sql
CREATE TABLE submissions_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_submissions_ip ON submissions_log(ip_hash, created_at);
```

---

## 3. API Endpoints

All endpoints: `https://api.notebooklm-marketplace.com/` (Workers)

### `GET /api/notebooks`
List notebooks with pagination, filtering, and search.

**Query params:**
- `page` (int, default 1)
- `limit` (int, default 12, max 50)
- `category` (string, optional — category slug)
- `tag` (string, optional — filter by tag)
- `search` (string, optional — full-text search)
- `sort` (string: `recent` | `popular`, default `recent`)

**Response:**
```json
{
  "notebooks": [
    {
      "id": "uuid",
      "title": "...",
      "description": "...",
      "share_url": "...",
      "categories": ["education"],
      "tags": ["physics", "quantum"],
      "preview_url": null,
      "likes": 42,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 248,
  "page": 1,
  "limit": 12
}
```

### `GET /api/notebooks/:id`
Get single notebook detail.

**Response:** Same as above but single object.

### `POST /api/notebooks`
Submit a new notebook.

**Body (multipart/form-data or JSON):**
```json
{
  "title": "string (3-120 chars)",
  "description": "string (20-1000 chars)",
  "share_url": "string (notebooklm.google.com/*)",
  "categories": ["education"],
  "tags": ["physics", "quantum"],
  "preview_image": "file (optional, max 5MB, image/*)"
}
```

**Headers required:** `CF-Turnstile-Token` (Turnstile widget token)

**Response (201):**
```json
{
  "id": "uuid",
  "success": true
}
```

**Rate limit:** Max 3 submissions per IP per hour.

### `POST /api/notebooks/:id/like`
Toggle like on a notebook.

**Body:** empty

**Response:**
```json
{
  "id": "uuid",
  "likes": 43,
  "liked": true
}
```

**Rate limit:** Max 100 likes per IP per hour.

### `GET /api/categories`
Get category list.

**Response:**
```json
{
  "categories": [
    {"slug": "education", "name": "Education", "icon": "school", "count": 42}
  ]
}
```

### `GET /api/tags/trending`
Get trending tags (most used in last 30 days).

**Response:**
```json
{
  "tags": [
    {"name": "AI Research", "count": 15}
  ]
}
```

---

## 4. Validation Rules

| Field | Rule | Error Message |
|---|---|---|
| `title` | Required, 3-120 chars | "Title must be between 3 and 120 characters" |
| `description` | Required, 20-1000 chars | "Description must be between 20 and 1000 characters" |
| `share_url` | Required, must match `notebooklm.google.com/*` | "Must be a valid NotebookLM link (notebooklm.google.com)" |
| `categories` | Required, 1-3 categories, must be valid slugs | "Select 1-3 categories from the list" |
| `tags` | Optional, max 10 tags, each 2-30 chars | "Tags must be 2-30 characters each, max 10 tags" |
| `preview_image` | Optional, max 5MB, image/* MIME | "Image must be under 5MB (PNG/JPG/WebP)" |

---

## 5. Frontend Routes

| Route | Page | Description |
|---|---|---|
| `/` | Discover | Grid of notebooks + sidebar + search |
| `/notebook/:id` | Detail | Full notebook info + Open in NotebookLM |
| `/submit` | Submit | Submission form |
| `/category/:slug` | Discover (filtered) | Pre-filtered by category |

---

## 6. Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "fields": {
      "title": "Title must be between 3 and 120 characters"
    }
  }
}
```

Error codes: `VALIDATION_ERROR`, `RATE_LIMITED`, `TURNSTILE_FAILED`, `NOT_FOUND`, `INTERNAL_ERROR`
