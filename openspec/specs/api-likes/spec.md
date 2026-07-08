# api-likes Specification

## Purpose

Toggle like/unlike on a notebook, with IP-based rate limiting and existence validation.

## Requirements

### Requirement: Like Toggle (drift #5 — decided: 404 on missing notebook)

The system SHALL toggle like state on `POST /api/notebooks/:id/like`.

- MUST check notebook existence first; return 404 if not found.
- MUST identify the client via `CF-Connecting-IP` (fallback `X-Forwarded-For`), hashed with SHA-256 (no salt — drift #2, decided: tested wins).
- If no existing like: INSERT into `likes_log`, increment `notebooks.likes`, return `{ id, likes, liked: true }`.
- If existing like: DELETE from `likes_log`, decrement `notebooks.likes` (floor 0), return `{ id, likes, liked: false }`.

#### Scenario: First like

- GIVEN notebook "abc" exists with 5 likes, IP has not liked it
- WHEN `POST /api/notebooks/abc/like`
- THEN status 200, body is `{ id: "abc", likes: 6, liked: true }`
- AND `likes_log` has a new row for this IP+notebook

#### Scenario: Unlike (toggle off)

- GIVEN notebook "abc" exists, IP has already liked it
- WHEN `POST /api/notebooks/abc/like`
- THEN status 200, body is `{ id: "abc", likes: N-1, liked: false }`
- AND `likes_log` row is deleted

#### Scenario: Non-existent notebook

- GIVEN no notebook with id "zzz"
- WHEN `POST /api/notebooks/zzz/like`
- THEN status 404, body has `error.code === "NOT_FOUND"`

### Requirement: Like Rate Limit (drift #3 — decided: 30/hour from production value)

The system SHALL enforce a per-IP rate limit on like actions.

- Limit: 30 actions per hour per IP hash (configurable via `RATE_LIMIT_MAX`; default 30 to match the production value users have been seeing).
- Window: 3600 seconds sliding from `datetime('now')`.
- Count includes both likes and unlikes (all `likes_log` entries).
- On limit exceeded: return 429 with `{ error: { code: "RATE_LIMITED", message: "Too many likes. Try again later." } }`.

#### Scenario: Under limit

- GIVEN IP has performed 29 like actions in the last hour
- WHEN another like is attempted
- THEN request succeeds normally

#### Scenario: At limit

- GIVEN IP has performed 30 like actions in the last hour
- WHEN another like is attempted
- THEN status 429, `error.code === "RATE_LIMITED"`

#### Scenario: Old actions don't count

- GIVEN IP has 30 actions but all are > 1 hour old
- WHEN another like is attempted
- THEN request succeeds (window has slid past)
