# Explore — NotebookLM Marketplace

## Concept
A community-driven marketplace (gallery/directory) for Google NotebookLM public notebooks. Users share links to their curated NotebookLM notebooks so others can discover, browse, and use them.

## What NotebookLM Offers for Sharing
- Google NotebookLM recently launched **public notebooks** — any consumer account can set a notebook to "Anyone with a link"
- Shared notebooks are accessible to anyone with a Google account
- The shared page shows the notebook's title, sources, and artifacts, but does NOT expose a public API for metadata
- **No official API exists** to programmatically retrieve notebook metadata (author, source count, etc.)

## Similar Marketplaces/References
- **Product Hunt** — community-driven product discovery (inspiration for voting/likes, categories)
- **Dribbble** — design portfolio discovery (inspiration for card grid layout, tagging)
- **Chrome Web Store** — extension/theme directory (inspiration for categories, submission flow)

## Validation
- NotebookLM has a growing user base (students, researchers, AI enthusiasts)
- There's currently **no centralized directory** for finding shared NotebookLM notebooks
- The "Featured Notebooks" tab in NotebookLM is curated by Google, not community-driven
- A community marketplace fills a clear gap

## Design References
Located in `stitch-notebooklm-asset-marketplace/`:
- **Home (Discover)**: Grid of notebook cards with sidebar categories, search, trending tags, filter by All/Trending/Recent
- **Notebook Detail**: Full preview, description, tags, sidebar with Open in NotebookLM / Share buttons
- **Submit Form**: Title, link, description, categories (multi-chip), tags, optional image preview

## Architecture Constraints
- **Cost**: Absolute $0 — free tiers only
- **Stack**: Cloudflare Workers + D1 (free tier: 100k req/day, 5GB storage)
- **Frontend**: Static HTML/CSS/JS served by Cloudflare Pages (or Workers)
- **Submissions**: Public form → Workers API → D1 (no auth required)
- **Anti-abuse**: Cloudflare Turnpike + IP rate limiting in Workers
- **Likes**: Simple counter in D1, rate-limited per IP

## Data Model (Proposed)
```
notebooks:
  - id: string (UUID)
  - title: string
  - description: string
  - share_url: string (notebooklm.google.com link)
  - category: string (fixed taxonomy)
  - tags: string[] (free-form, stored as JSON)
  - preview_image: string? (URL, optional)
  - likes: integer (default 0)
  - created_at: timestamp
```

## Risk / Open Questions
1. ~~No author attribution~~ — ✅ Decisión: sin autor, avatar ni fuentes en el listing
2. Image uploads need storage — R2 is free (10GB) but adds complexity
3. NotebookLM public links may break if Google changes sharing model
4. Spam prevention without auth is challenging — Turnstile + rate limiting is first line
