# api-notebooks Specification

## Purpose

Read-only notebook endpoints: list with pagination/search/filter, detail by ID, category metadata, and trending tags. All responses are JSON.

## Requirements

### Requirement: Notebook List

The system SHALL return a paginated JSON array of notebooks from `GET /api/notebooks`.

Query parameters: `page` (default 1, min 1), `limit` (default 12, max 50), `category` (optional slug), `tag` (optional string), `search` (optional FTS5 query), `sort` (`recent` | `popular`).

- List responses MUST include `{ notebooks, total, page, limit }`.
- Each notebook object MUST include: `id`, `title`, `description` (truncated to 200 chars in list), `share_url`, `categories` (parsed JSON), `tags` (parsed JSON), `preview_url`, `likes`, `created_at`.
- FTS5 search MUST sanitize input: strip non-word chars, quote each token, join with AND.
- Category filter MUST use D1 `||` concatenation for LIKE binding.
- Sort `popular` MUST order by `likes DESC, created_at DESC`; default is `created_at DESC`.

#### Scenario: Default list returns first page

- GIVEN 25 notebooks in DB
- WHEN `GET /api/notebooks` is called with no params
- THEN response status is 200
- AND body contains 12 notebooks, `total` is 25, `page` is 1, `limit` is 12

#### Scenario: Search with FTS5

- GIVEN notebooks with title "Machine Learning Basics"
- WHEN `GET /api/notebooks?search=machine+learning` is called
- THEN response contains matching notebooks via FTS5 JOIN
- AND description is truncated to 200 chars

#### Scenario: Empty search returns empty

- GIVEN any DB state
- WHEN `GET /api/notebooks?search=!!!` is called (all chars stripped)
- THEN response is `{ notebooks: [], total: 0, page: 1, limit: 12 }`

#### Scenario: Category filter

- GIVEN 5 notebooks with category "education"
- WHEN `GET /api/notebooks?category=education`
- THEN only notebooks containing "education" in categories are returned

### Requirement: Notebook Detail

The system SHALL return a full notebook from `GET /api/notebooks/:id`.

- Response MUST include full `description` (not truncated).
- If notebook does not exist, MUST return 404 with `{ error: { code: "NOT_FOUND", message: "Notebook not found" } }`.

#### Scenario: Existing notebook

- GIVEN a notebook with id "abc-123"
- WHEN `GET /api/notebooks/abc-123`
- THEN status 200, body includes full description and all fields

#### Scenario: Missing notebook

- GIVEN no notebook with id "zzz"
- WHEN `GET /api/notebooks/zzz`
- THEN status 404, body has `error.code === "NOT_FOUND"`

### Requirement: Categories Endpoint

The system SHALL return category metadata with counts from `GET /api/categories`.

- Response MUST include all 10 predefined categories with `slug`, `name`, `icon`, `count`.
- Count MUST reflect actual notebook occurrences.

#### Scenario: Categories with notebooks

- GIVEN 3 notebooks tagged "education", 1 tagged "technology"
- WHEN `GET /api/categories`
- THEN education count is 3, technology count is 1, others are 0

### Requirement: Trending Tags

The system SHALL return top 10 tags from the last 30 days from `GET /api/tags/trending`.

- Tags MUST be sorted by count descending.
- Only notebooks created within 30 days are considered.

#### Scenario: Trending tags

- GIVEN 5 notebooks from last 30 days with tags ["ai", "ml"] and 3 with ["ai"]
- WHEN `GET /api/tags/trending`
- THEN response is `{ tags: [{ name: "ai", count: 8 }, { name: "ml", count: 5 }] }`

#### Scenario: No recent notebooks

- GIVEN no notebooks from last 30 days
- WHEN `GET /api/tags/trending`
- THEN response is `{ tags: [] }`
