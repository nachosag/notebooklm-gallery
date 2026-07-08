# deployment-topology Specification

## Purpose

Cloudflare deployment configuration: Worker (`notebooklm-gallery-api`) reached via Pages Service Binding, Pages for static assets and client-side routing. Defines bindings, routes, secrets, and environment separation.

## Requirements

### Requirement: Worker Configuration

The system SHALL deploy `workers/api/` as a Worker named `notebooklm-gallery-api`, reachable from Pages Function via Service Binding.

- `wrangler.toml` MUST specify `name = "notebooklm-gallery-api"`, `main = "src/index.js"`, `compatibility_date = "2025-01-01"`.
- Production environment section `[env.production]` MUST include `account_id`.
- Worker MUST bind D1 database `notebooklm-marketplace` as `DB`.
- Worker MUST bind R2 bucket `notebooklm-marketplace-previews` as `PREVIEW_IMAGES`.
- Worker MUST bind KV namespace as `SITEMAP_CACHE`.

#### Scenario: Production deploy dry-run

- GIVEN `workers/api/wrangler.toml` is correctly configured
- WHEN `wrangler deploy --dry-run --env production` is executed
- THEN command exits with code 0
- AND output shows correct binding names and IDs

### Requirement: Service Binding and Routing

The system SHALL route API and SEO traffic to the Worker via Pages Service Binding.

- `frontend/wrangler.toml` MUST define `[[services]]` with `binding = "API"` and `service = "notebooklm-gallery-api"`.
- `frontend/_worker.js` (thin proxy) MUST forward `/api/*`, `/sitemap.xml`, `/robots.txt` to `env.API.fetch(request)`.
- Requests not matching those patterns MUST be served by `env.ASSETS.fetch()` (Pages static + `_redirects`).
- Pages MUST handle `/notebook/*` via `_redirects` file (SPA fallback to `/notebook.html`).

#### Scenario: API routes reach Worker via proxy

- GIVEN `frontend/_worker.js` has thin proxy and service binding is configured
- WHEN request hits `/api/notebooks`
- THEN Pages Function forwards to Worker, Worker handles the request

#### Scenario: SEO routes reach Worker via proxy

- GIVEN thin proxy and service binding configured
- WHEN request hits `/sitemap.xml`
- THEN Pages Function forwards to Worker, Worker handles the request

#### Scenario: Notebook SPA routes reach Pages

- GIVEN Pages is deployed with `_redirects`
- WHEN request hits `/notebook/abc-123`
- THEN Pages serves `notebook.html` (client-side routing)

### Requirement: Secrets Management

The system SHALL store `TURNSTILE_SECRET` as a Worker secret, not a plain env var.

- Secret MUST be set via `wrangler secret put TURNSTILE_SECRET --env production`.
- Secret MUST NOT appear in `wrangler.toml` or any committed file.
- Dev environment: `TURNSTILE_SECRET` is unset, Turnstile verification is skipped.

#### Scenario: Secret is configured

- GIVEN `wrangler secret put TURNSTILE_SECRET --env production` has been run
- WHEN Worker starts in production
- THEN `env.TURNSTILE_SECRET` is available and non-empty

#### Scenario: Dev mode bypass

- GIVEN `TURNSTILE_SECRET` is not set
- WHEN Turnstile middleware runs
- THEN verification is skipped (returns `{ success: true }`)

### Requirement: Environment Separation

The system SHALL maintain separate dev and production configurations.

- Dev: `frontend/wrangler.toml` uses `local-dev` IDs for D1/KV, no `account_id`.
- Production: `workers/api/wrangler.toml [env.production]` uses real resource IDs.
- Both environments MUST use the same binding names (`DB`, `PREVIEW_IMAGES`, `SITEMAP_CACHE`).

#### Scenario: Dev environment

- GIVEN `frontend/wrangler.toml` configuration
- WHEN `wrangler dev` is run
- THEN local D1, R2, KV bindings are used

#### Scenario: Production environment

- GIVEN `workers/api/wrangler.toml [env.production]`
- WHEN `wrangler deploy --env production` is run
- THEN production D1, R2, KV resource IDs are used

### Requirement: Pages Static Configuration

The system SHALL configure Pages to serve only static assets after Worker deployment.

- `frontend/wrangler.toml` MUST set `pages_build_output_dir`.
- `frontend/_redirects` MUST map `/notebook/*` to `/notebook.html` (status 200).
- `frontend/_worker.js` SHALL be reduced to a thin proxy (~15 lines) forwarding API/SEO routes to the Worker via service binding.

#### Scenario: Static asset serving

- GIVEN Pages is deployed
- WHEN request hits `/` or `/styles.css`
- THEN Pages serves the static file

#### Scenario: SPA fallback

- GIVEN `_redirects` contains `/notebook/*  /notebook.html  200`
- WHEN request hits `/notebook/any-id`
- THEN Pages serves `notebook.html`
