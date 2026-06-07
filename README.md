# NotebookLM Marketplace

A community-driven marketplace for discovering and sharing public Google NotebookLM notebooks. Browse curated knowledge bases across categories like Education, Technology, Research, and more.

**Cost:** $0 — runs entirely on Cloudflare free tier.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Cloudflare Pages + Tailwind CSS | Free static hosting, global CDN |
| Backend API | Cloudflare Workers | 100k req/day free, serverless |
| Database | Cloudflare D1 (SQLite) | 5GB free, SQL, integrates with Workers |
| File Storage | Cloudflare R2 | 10GB free, S3-compatible |
| Anti-abuse | Cloudflare Turnstile | Free, invisible CAPTCHA alternative |
| Analytics | Cloudflare Web Analytics | Free, privacy-first |

## Architecture

```
Visitor → Cloudflare CDN → Cloudflare Pages (HTML/CSS/JS)
                              │
                              ▼ (API calls from browser)
                         Cloudflare Workers (API logic)
                              │
                              ├── D1 Database (notebooks, likes)
                              └── R2 Storage (preview images)
```

The frontend is a multi-page static site served by Cloudflare Pages. The backend is a single Cloudflare Worker with D1 for persistent storage and R2 for image uploads.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/): `npm install -g wrangler`
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier)

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd notebooklm-marketplace
cd workers/api && npm install
```

### 2. Set up D1 database

```bash
cd workers/api
wrangler d1 create notebooklm-marketplace
# → Copy the database_id into wrangler.toml
```

### 3. Set up R2 bucket

```bash
wrangler r2 bucket create notebooklm-marketplace-previews
```

### 4. Run the Worker locally

```bash
cd workers/api
wrangler dev
```

The API will be available at `http://localhost:8787`. The frontend can be served with any static file server:

```bash
cd frontend
python -m http.server 3000
```

### 5. Run D1 migrations

```bash
cd workers/api
wrangler d1 migrations apply notebooklm-marketplace --local
```

### 6. Set up Turnstile

Create a Turnstile site key in the [Cloudflare Dashboard](https://dash.cloudflare.com/). Set the environment variable:

```bash
echo "TURNSTILE_SECRET_KEY=your_secret" >> workers/api/.env
echo "TURNSTILE_SITE_KEY=your_site_key" >> frontend/.env
```

## Deployment

### Worker

```bash
cd workers/api
wrangler deploy
```

### Frontend

1. Go to Cloudflare Dashboard → Pages → Create a project
2. Connect your Git repository
3. Build command: none (static files)
4. Output directory: `frontend`
5. Deploy

Or via Wrangler:

```bash
npx wrangler pages deploy frontend
```

### CI/CD (GitHub Actions)

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys the Worker and frontend on pushes to `main`. Configure these secrets in your repo:

- `CF_API_TOKEN`: Cloudflare API token with Workers and Pages permissions

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/notebooks` | List notebooks (paginated, filterable) |
| GET | `/api/notebooks/:id` | Get notebook detail |
| POST | `/api/notebooks` | Submit a new notebook |
| POST | `/api/notebooks/:id/like` | Toggle like on a notebook |
| GET | `/api/categories` | List categories with counts |
| GET | `/api/tags/trending` | List trending tags |

## Project Structure

```
notebooklm-marketplace/
├── frontend/               # Cloudflare Pages site
│   ├── index.html          # Discover page (notebook grid)
│   ├── notebook.html       # Notebook detail page
│   ├── submit.html         # Submission form
│   ├── css/style.css       # Tailwind + custom styles
│   └── js/                 # Client-side JavaScript
├── workers/
│   └── api/                # Cloudflare Workers API
│       ├── src/
│       │   ├── index.js    # Entry point + router
│       │   ├── db/schema.js
│       │   ├── handlers/   # Route handlers
│       │   ├── middleware/  # CORS, rate limit, Turnstile
│       │   └── utils/      # Validation, IP hashing
│       ├── wrangler.toml
│       └── package.json
├── openspec/               # SDD artifacts
├── .github/workflows/      # CI/CD
└── README.md
```

## License

MIT
