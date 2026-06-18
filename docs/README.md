# NotebookLM Gallery Documentation

A community-driven gallery for discovering and sharing public Google NotebookLM notebooks. Browse curated knowledge bases across categories like Education, Technology, Research, and more.

**Cost:** $0 — runs entirely on Cloudflare free tier.

## Quick path

1. **Understand the architecture** - Frontend static site + serverless API
2. **Run locally** - `wrangler dev` in workers/api for API, Python server for frontend
3. **Submit a notebook** - Use submit.html form (Turnstile protected)
4. **Review changes** - Check PR descriptions for scope and testing requirements

## Details

| Topic | Decision |
|-------|----------|
| Architecture | Cloudflare Pages (frontend) + Cloudflare Workers (API) with D1 (SQLite) and R2 (storage) |
| Tech Stack | Cloudflare ecosystem for free tier limits (100k req/day, 5GB D1, 10GB R2) |
| Testing | Vitest + @cloudflare/vitest-pool-workers with Miniflare emulation |
| Anti-abuse | Cloudflare Turnstile (free, invisible CAPTCHA) |
| Local Dev | wrangler dev for API, Python http.server for frontend |

## Checklist

- [ ] Have Cloudflare account and API token for production deployment
- [ ] Set up Turnstile keys in .env files for local development
- [ ] Install Node.js v18+ and wrangler CLI
- [ ] Configure GitHub Actions secrets (CF_API_TOKEN)
- [ ] Run `wrangler d1 create notebooklm-marketplace` and copy database_id

## Next step

Start with local development: `cd workers/api && wrangler dev` to test API changes, then `cd frontend && python -m http.server 3000` to test frontend.