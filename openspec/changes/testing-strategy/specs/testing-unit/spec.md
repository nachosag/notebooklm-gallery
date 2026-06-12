# Testing Unit Specification

## Purpose

Unit test infrastructure for pure functions in the NotebookLM Marketplace API. Covers input validation and IP hashing — the building blocks that integration tests depend on.

## Requirements

### Requirement: Validation Branch Coverage

The test suite MUST exercise every branch in `validateNotebook()` — valid paths, boundary conditions, and error paths for each field.

#### Scenario: Valid notebook data passes

- GIVEN a notebook object with valid title (3-120 chars), description (20-1000 chars), share_url (https://notebooklm.google.com), and 1-3 categories
- WHEN `validateNotebook()` is called
- THEN the result has `valid: true` and `errors: null`

#### Scenario: Title too short

- GIVEN a notebook with title "ab" (2 chars)
- WHEN `validateNotebook()` is called
- THEN `errors.title` is set and `valid` is false

#### Scenario: Title at exact boundaries

- GIVEN a notebook with title of exactly 3 chars, then 120 chars
- WHEN `validateNotebook()` is called
- THEN `valid` is true for both

#### Scenario: Title missing or empty

- GIVEN a notebook with `title: ""` or `title: undefined`
- WHEN `validateNotebook()` is called
- THEN `errors.title` is set

#### Scenario: Description too short

- GIVEN a notebook with description "short" (19 chars)
- WHEN `validateNotebook()` is called
- THEN `errors.description` is set

#### Scenario: Description at boundary

- GIVEN a notebook with description of exactly 20 chars and exactly 1000 chars
- WHEN `validateNotebook()` is called
- THEN `valid` is true for both

#### Scenario: Invalid share_url formats

- GIVEN share_url values: "http://notebooklm.google.com", "https://example.com", "not-a-url", empty string
- WHEN `validateNotebook()` is called
- THEN `errors.share_url` is set for each

#### Scenario: Valid share_url passes

- GIVEN share_url is "https://notebooklm.google.com/notebook/abc123"
- WHEN `validateNotebook()` is called
- THEN `errors.share_url` is not set

#### Scenario: Categories validation

- GIVEN categories as: empty array, array with 4 items, array with invalid category string, non-array value
- WHEN `validateNotebook()` is called
- THEN `errors.categories` is set for each

#### Scenario: Categories at boundary

- GIVEN categories with exactly 1 and exactly 3 valid entries
- WHEN `validateNotebook()` is called
- THEN `valid` is true for both

#### Scenario: Tags validation

- GIVEN tags as: array with 11 items, array containing a string shorter than 2 chars, non-array value
- WHEN `validateNotebook()` is called
- THEN `errors.tags` is set for each

#### Scenario: Valid tags pass

- GIVEN tags: `["ai", "productivity"]` (2-30 chars each, ≤10 items)
- WHEN `validateNotebook()` is called
- THEN `errors.tags` is not set

#### Scenario: Optional tags field

- GIVEN a notebook with no `tags` key
- WHEN `validateNotebook()` is called
- THEN `valid` is true — tags are optional

---

### Requirement: IP Hash Consistency

The `hashIp()` function MUST produce deterministic SHA-256 hashes for the same input.

#### Scenario: Same IP produces same hash

- GIVEN the IP string "192.168.1.1"
- WHEN `hashIp()` is called twice
- THEN both calls return the identical hex string

#### Scenario: Different IPs produce different hashes

- GIVEN IP strings "192.168.1.1" and "10.0.0.1"
- WHEN `hashIp()` is called for each
- THEN the two hashes differ

#### Scenario: Hash format validity

- GIVEN any IP string
- WHEN `hashIp()` is called
- THEN the result is a 64-character lowercase hex string (SHA-256 output)

#### Scenario: Empty string input

- GIVEN an empty string ""
- WHEN `hashIp()` is called
- THEN a valid hash is returned (no crash)
