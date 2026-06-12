# Testing Integration Specification

## Purpose

Integration test infrastructure for the submit handler — the critical user path. Tests the full flow from request parsing through D1 insert and R2 upload, with mocked Cloudflare bindings.

## Requirements

### Requirement: Submit Handler Happy Path

Integration tests MUST cover the complete submission flow with all mocks in place, verifying end-to-end behavior from request to response.

#### Scenario: Valid JSON submission succeeds

- GIVEN a POST request with `Content-Type: application/json` and valid notebook data plus a valid Turnstile token header
- WHEN `handleSubmit()` is called with mocked D1, R2, and Turnstile bindings
- THEN the response is 201 with `{ id: "<uuid>", success: true }` and D1 `INSERT INTO notebooks` was called with trimmed fields

#### Scenario: Valid multipart/form-data submission succeeds

- GIVEN a POST request with `Content-Type: multipart/form-data` containing form fields and a preview image file
- WHEN `handleSubmit()` is called
- THEN the response is 201, the image is stored in R2 at `preview-images/`, and `preview_url` is set in the D1 insert

---

### Requirement: Submit Handler Validation Failures

Integration tests MUST verify that validation errors are returned before any external calls (Turnstile, D1, R2).

#### Scenario: Invalid body returns 400

- GIVEN a POST request with malformed JSON body
- WHEN `handleSubmit()` is called
- THEN the response is 400 with code `VALIDATION_ERROR`

#### Scenario: Validation failure blocks Turnstile check

- GIVEN a POST request with invalid title (too short) but a valid Turnstile token
- WHEN `handleSubmit()` is called
- THEN the response is 400 and Turnstile `fetch` was NOT called

---

### Requirement: Turnstile Verification

Integration tests MUST verify Turnstile behavior in both dev mode (secret missing) and production mode.

#### Scenario: Dev mode bypasses verification

- GIVEN `env.TURNSTILE_SECRET` is undefined and any token value
- WHEN `handleSubmit()` is called
- THEN the request proceeds to rate limiting without calling Cloudflare's siteverify endpoint

#### Scenario: Production mode rejects invalid token

- GIVEN `env.TURNSTILE_SECRET` is set and the token is invalid
- WHEN `handleSubmit()` is called
- THEN the response is 403 with code `TURNSTILE_FAILED`

#### Scenario: Production mode accepts valid token

- GIVEN `env.TURNSTILE_SECRET` is set and siteverify returns `{ success: true }`
- WHEN `handleSubmit()` is called
- THEN the request proceeds to rate limiting

---

### Requirement: Rate Limiting

Integration tests MUST verify the rate limit check against D1 and the correct rejection response.

#### Scenario: Under limit allows submission

- GIVEN the IP hash has 2 prior submissions in the window (limit is 3)
- WHEN `handleSubmit()` is called
- THEN the submission proceeds and a new row is inserted into `submissions_log`

#### Scenario: At limit rejects submission

- GIVEN the IP hash has 3 prior submissions in the window (limit is 3)
- WHEN `handleSubmit()` is called
- THEN the response is 429 with code `RATE_LIMITED`

---

### Requirement: Image Upload

Integration tests MUST verify image handling for both File uploads and base64 data URLs.

#### Scenario: File upload to R2

- GIVEN a request with a valid PNG image file attachment
- WHEN `handleSubmit()` is called
- THEN `PREVIEW_IMAGES.put()` is called with a key under `preview-images/` and the correct content type

#### Scenario: Base64 image upload

- GIVEN a request with `preview_image` set to a `data:image/png;base64,...` string
- WHEN `handleSubmit()` is called
- THEN the image is decoded, stored in R2, and `preview_url` is set

#### Scenario: Invalid image type rejected

- GIVEN a file with MIME type `image/gif`
- WHEN `handleSubmit()` is called
- THEN the response is 400 with code `VALIDATION_ERROR` and message about allowed types

#### Scenario: Image over 5MB rejected

- GIVEN a file with size exceeding 5 MB
- WHEN `handleSubmit()` is called
- THEN the response is 400 with code `VALIDATION_ERROR` and message about size limit

#### Scenario: R2 failure is non-fatal

- GIVEN `PREVIEW_IMAGES.put()` throws an error
- WHEN `handleSubmit()` is called with a valid image
- THEN the submission still succeeds with `preview_url: null`

---

### Requirement: Error Handling

Integration tests MUST verify that unhandled errors return a safe 500 response.

#### Scenario: D1 insert failure returns 500

- GIVEN `env.DB.prepare().run()` throws during the notebooks INSERT
- WHEN `handleSubmit()` is called with otherwise valid data
- THEN the response is 500 with code `INTERNAL_ERROR` and the error is logged
