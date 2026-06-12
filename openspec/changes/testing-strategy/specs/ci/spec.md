# CI Specification

## Purpose

Continuous integration infrastructure for test execution. Covers Vitest configuration with Cloudflare Workers pool, GitHub Actions workflow for PR validation, and test file conventions.

## Requirements

### Requirement: Vitest Configuration

The project MUST use Vitest with `@cloudflare/vitest-pool-workers` to run tests inside a Cloudflare Workers-compatible environment.

#### Scenario: Vitest runs with Workers pool

- GIVEN `vitest.config.js` is configured with `@cloudflare/vitest-pool-workers`
- WHEN `npm test` or `npx vitest run` is executed in `workers/api/`
- THEN tests execute inside the Workers pool with access to `crypto.subtle`, `fetch`, and Workers globals

#### Scenario: Test files are auto-discovered

- GIVEN test files matching `test/**/*.test.js` exist
- WHEN Vitest runs
- THEN all matching test files are discovered and executed without explicit file listing

---

### Requirement: CI Workflow on Pull Requests

A dedicated GitHub Actions workflow MUST run tests on every pull request, separate from the existing deploy workflow.

#### Scenario: Tests run on PR open/sync

- GIVEN a pull request is opened or new commits are pushed to it
- WHEN the CI workflow triggers
- THEN all tests in `workers/api/` execute and the workflow status reflects pass/fail

#### Scenario: Deploy workflow is unaffected

- GIVEN the existing `.github/workflows/deploy.yml` runs on push to main
- WHEN the test CI workflow is added
- THEN the deploy workflow continues to operate independently — no shared steps or dependencies

#### Scenario: CI uses correct Node version

- GIVEN the CI workflow runs on `ubuntu-latest`
- WHEN the workflow checks out code and installs dependencies
- THEN it uses Node.js 18+ (matching Workers runtime compatibility)

#### Scenario: CI installs and tests in workers/api

- GIVEN the monorepo structure with frontend/ and workers/api/
- WHEN the CI workflow runs
- THEN it installs dependencies and runs tests specifically in `workers/api/` (not the root or frontend/)

---

### Requirement: Test File Structure

Tests MUST follow a consistent directory and naming convention that separates unit and integration tests.

#### Scenario: Unit tests directory

- GIVEN the project needs unit tests for pure functions
- WHEN test files are created
- THEN they live in `workers/api/test/unit/` and are named `{module}.test.js` (e.g., `validation.test.js`)

#### Scenario: Integration tests directory

- GIVEN the project needs integration tests for handlers
- WHEN test files are created
- THEN they live in `workers/api/test/integration/` and are named `{handler}.test.js` (e.g., `submit.test.js`)

#### Scenario: Test naming convention

- GIVEN any test file
- WHEN test cases are written
- THEN `describe()` blocks name the module/function under test and `it()` blocks describe the specific behavior in plain language

---

### Requirement: Mocking Strategy for Cloudflare Bindings

Integration tests MUST mock Cloudflare bindings (D1, R2, Turnstile) at the module boundary, not by spinning up real services.

#### Scenario: D1 mock captures queries

- GIVEN a test needs to verify database interactions
- WHEN the submit handler calls `env.DB.prepare().bind().run()`
- THEN the mock records the SQL string and bound parameters for assertion

#### Scenario: R2 mock captures puts

- GIVEN a test needs to verify image uploads
- WHEN the handler calls `env.PREVIEW_IMAGES.put()`
- THEN the mock records the key, value, and options for assertion

#### Scenario: Turnstile mock controllable per test

- GIVEN individual tests need different Turnstile outcomes
- WHEN each test configures its mock
- THEN the mock returns the specified result (success or failure) for that test only
