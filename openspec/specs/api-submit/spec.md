# api-submit Specification

## Purpose

Notebook submission endpoint: validates input, verifies Turnstile, rate-limits by IP, optionally uploads preview image to R2, and inserts into D1.

## Requirements

### Requirement: Input Validation (drift #4, decided: hybrid)

The system SHALL validate submission payload before processing.

- `title`: required string, 3–120 chars.
- `description`: required string, 20–1000 chars.
- `share_url`: required, MUST be valid URL with `https:` protocol and hostname exactly `notebooklm.google.com` (strict hostname drift #4 — decided).
- `categories`: optional array, 0+ items allowed (lenient), each item when present MUST be from the 10 predefined slugs. Max 3.
- `tags`: optional array, max 10 items, each 2–30 chars string.
- Error response: 400 with `{ error: { code: "VALIDATION_ERROR", message: "Invalid fields", fields: { ... } } }`.

#### Scenario: Valid JSON submission

- GIVEN valid payload with all required fields (categories may be absent)
- WHEN `POST /api/notebooks` with `Content-Type: application/json`
- THEN validation passes, processing continues

#### Scenario: Invalid share_url

- GIVEN `share_url` with wrong host or `http://` protocol
- WHEN submitted
- THEN status 400, `error.fields.share_url` is defined

#### Scenario: Categories absent

- GIVEN payload with no `categories` field
- WHEN submitted
- THEN validation passes (lenient)

#### Scenario: Too many categories

- GIVEN payload with 4+ categories
- WHEN submitted
- THEN status 400, `error.fields.categories` is defined

### Requirement: Turnstile Verification

The system SHALL verify the Turnstile token before accepting a submission.

- Token from `CF-Turnstile-Token` header or `cf_turnstile_token` body field.
- If `TURNSTILE_SECRET` env is unset: skip verification (dev mode).
- If verification fails: return 403 with `{ error: { code: "TURNSTILE_FAILED", ... } }`.

#### Scenario: Valid token

- GIVEN valid Turnstile token
- WHEN submitted
- THEN processing continues

#### Scenario: Missing token

- GIVEN no token provided
- WHEN submitted
- THEN status 403, `error.code === "TURNSTILE_FAILED"`

#### Scenario: Dev mode (no secret)

- GIVEN `TURNSTILE_SECRET` is not set in env
- WHEN submitted without token
- THEN verification is skipped, processing continues

### Requirement: Submission Rate Limit

The system SHALL limit submissions to 3 per hour per IP hash.

- Uses `submissions_log` table.
- On limit exceeded: return 429 with `{ error: { code: "RATE_LIMITED", message: "You can submit at most 3 notebooks per hour" } }`.

#### Scenario: Under limit

- GIVEN IP has submitted 2 notebooks in the last hour
- WHEN a 3rd submission is made
- THEN it succeeds (2 < 3)

#### Scenario: At limit

- GIVEN IP has submitted 3 notebooks in the last hour
- WHEN a 4th submission is attempted
- THEN status 429, `error.code === "RATE_LIMITED"`

### Requirement: Image Upload (drift #6, decided: non-fatal)

The system SHALL accept optional preview images via multipart or base64 data URL.

- Allowed: `image/png`, `image/jpeg`, `image/webp`. Max 5 MB.
- Stored in R2 at `preview-images/{uuid}.{ext}`, returned as `/api/images/{key}`.
- R2 failure (non-validation): log, continue without image.
- Validation error (bad type/size): return 400.

#### Scenario: Multipart or base64 upload success

- GIVEN valid form-data with `preview_image` file (PNG, 1 MB) or JSON body with `preview_image: "data:image/png;base64,..."`
- WHEN submitted
- THEN image stored in R2, `preview_url` is `/api/images/preview-images/{uuid}.png`

#### Scenario: Invalid image type

- GIVEN file with type `image/gif`
- WHEN submitted
- THEN status 400, `error.code === "VALIDATION_ERROR"`

#### Scenario: R2 failure is non-fatal

- GIVEN valid image but R2 `put()` throws
- WHEN submitted
- THEN submission succeeds without `preview_url` (logged, not failed)

### Requirement: Successful Submission

The system SHALL insert the notebook and return 201 on success.

- Generate UUID for notebook ID.
- Insert into `notebooks` table with all fields.
- Log submission in `submissions_log`.
- Return 201 with `{ id, success: true }`.

#### Scenario: Full success

- GIVEN valid payload, Turnstile passes, rate limit ok
- WHEN submitted
- THEN status 201, body has `success: true` and valid UUID `id`
- AND notebook is queryable via `GET /api/notebooks/:id`
