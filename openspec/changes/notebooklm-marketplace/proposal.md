# Proposal — NotebookLM Marketplace

**Change:** `notebooklm-marketplace`
**Status:** Draft Proposal
**Executive Summary:** A zero-cost, community-driven marketplace for discovering and sharing public Google NotebookLM notebooks.

---

## Problem
Thousands of NotebookLM users create curated knowledge bases (study guides, research syntheses, technical references) but there is **no centralized directory** to discover them. The "Featured Notebooks" tab in NotebookLM is curated by Google, limited, and not community-driven.

## Solution
A public web gallery where anyone can:
- **Browse** notebooks by category and tags
- **Search** across all notebooks
- **View** notebook details with description, tags, and direct link to open in NotebookLM
- **Like** notebooks they find useful
- **Submit** their own NotebookLM public link for inclusion

## Target Users
- **Students** looking for study guides on specific topics
- **Researchers** sharing literature syntheses
- **AI enthusiasts** curating prompt collections and knowledge bases
- **Lifelong learners** discovering curated content

## Scope (MVP)

### ✅ In Scope
- Public browseable directory of notebook listings
- Sidebar with fixed category taxonomy
- Free-form tags per notebook
- Search by keyword (title, description, tags)
- Notebook detail page with full info + "Open in NotebookLM" button
- Like/unlike notebooks
- Submit form (public, no auth required)
- Anti-abuse via Cloudflare Turnstile + IP rate limiting
- Image preview upload (optional, 16:9, stored in R2)
- "Load more" pagination
- Mobile-responsive layout

### ❌ Out of Scope (MVP)
- User accounts / authentication / profiles
- Author attribution (no avatar, no author name)
- Source listing in detail page
- Comments or discussion
- Bookmarking / favorites
- Trending algorithm (just chronological + sort by likes)
- Admin dashboard
- Analytics

## User Flow
1. Visitor lands on **Discover** page → sees grid of notebooks with search + category filter
2. Clicks a notebook → **Detail page** with description, tags, preview image → "Open in NotebookLM" → opens Google NotebookLM
3. Clicks ❤️ → like counted
4. Clicks "Submit Notebook" → **Form** with title, link, description, categories, tags, optional image → submits to Workers API → stored in D1
5. Submission appears immediately on Discover page

## Success Metrics
- Notebook listings count
- Total likes
- Page views (Workers analytics or Cloudflare Web Analytics — free)

## Tech Stack
| Layer | Technology | Cost |
|---|---|---|
| DNS + CDN | Cloudflare | Free |
| Frontend hosting | Cloudflare Pages | Free |
| Backend API | Cloudflare Workers | Free (100k req/day) |
| Database | Cloudflare D1 | Free (5GB) |
| Image storage | Cloudflare R2 | Free (10GB) |
| Anti-abuse | Cloudflare Turnstile | Free |
| Analytics | Cloudflare Web Analytics | Free |

**Total monthly cost: $0**

## Visual Design
Uses the mockups in `stitch-notebooklm-asset-marketplace/` as reference:
- "Product Hunt meets Dribbble" aesthetic
- Vibrant Blue (#0061FF) primary
- Plus Jakarta Sans (headlines) + Inter (body)
- Max 1200px container, 12-column grid
- 3 card columns on desktop, 2 on tablet, 1 on mobile
- **Note**: mockups include author/sources — those elements are removed per decision

## Delivery Strategy
- Stacked PR strategy (≤400 lines per PR)
- PR chain: Setup → Schema → API → Homepage → Detail → Submit → Likes → Polish
