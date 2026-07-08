# cors-policy Specification

## Purpose

CORS middleware that restricts cross-origin access to an explicit allow-list. Applies to all routes including API and SEO endpoints.

## Requirements

### Requirement: CORS Allow-List (drift #1 — recommended winner: restrictive allow-list, user confirmed)

The system SHALL restrict cross-origin requests to an explicit allow-list of origins.

- Allowed origins: `["https://notebooklm-gallery.pages.dev", "http://localhost:8787"]`.
- For requests with `Origin` header matching the allow-list: respond with `Access-Control-Allow-Origin` set to that exact origin.
- For requests with `Origin` NOT in the allow-list: omit `Access-Control-Allow-Origin` header.
- MUST NOT use wildcard `*` for `Access-Control-Allow-Origin`.
- MUST include `Vary: Origin` header on all responses when origin is matched.

#### Scenario: Allowed origin receives CORS headers

- GIVEN request with `Origin: https://notebooklm-gallery.pages.dev`
- WHEN any API route is called
- THEN response includes `Access-Control-Allow-Origin: https://notebooklm-gallery.pages.dev`
- AND response includes `Vary: Origin`

#### Scenario: Disallowed origin receives no CORS headers

- GIVEN request with `Origin: https://evil.example.com`
- WHEN any API route is called
- THEN response does NOT include `Access-Control-Allow-Origin`

#### Scenario: No origin header

- GIVEN request without `Origin` header (same-origin or server-to-server)
- WHEN any API route is called
- THEN response does NOT include `Access-Control-Allow-Origin`

### Requirement: Preflight Handling

The system SHALL handle `OPTIONS` requests as CORS preflight.

- MUST return status 204 with no body.
- MUST include `Access-Control-Allow-Methods: GET, POST, OPTIONS`.
- MUST include `Access-Control-Allow-Headers: Content-Type, CF-Turnstile-Token`.
- MUST include `Access-Control-Max-Age: 86400`.
- If origin is allowed: include `Access-Control-Allow-Origin` with that origin.
- If origin is not allowed: omit `Access-Control-Allow-Origin`.

#### Scenario: Valid preflight

- GIVEN `OPTIONS /api/notebooks` with `Origin: http://localhost:8787`
- WHEN request is received
- THEN status 204, `Access-Control-Allow-Origin: http://localhost:8787`
- AND `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- AND `Access-Control-Max-Age: 86400`

#### Scenario: Preflight with disallowed origin

- GIVEN `OPTIONS /api/notebooks` with `Origin: https://evil.example.com`
- WHEN request is received
- THEN status 204
- AND `Access-Control-Allow-Origin` is NOT set

### Requirement: CORS on All Responses

The system SHALL add CORS headers to ALL successful responses (not just preflight).

- The `addCors` function MUST be applied to every response from the router.
- Headers `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Access-Control-Max-Age` MUST be present on every response.

#### Scenario: GET response includes CORS

- GIVEN `GET /api/notebooks` with allowed origin
- WHEN response is returned
- THEN CORS headers are present including `Access-Control-Allow-Origin`

#### Scenario: Error response includes CORS

- GIVEN a 404 response with allowed origin
- WHEN response is returned
- THEN CORS headers are still applied
