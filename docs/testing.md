# Testing Guide

## Overview

The NotebookLM Gallery has a comprehensive testing strategy with 58 tests total. Tests are organized into unit tests (40 tests) and integration tests (18 tests) using Vitest with Cloudflare's @cloudflare/vitest-pool-workers package for Miniflare emulation.

## Testing Strategy

### Unit Tests
- **Purpose**: Test pure functions and business logic
- **Location**: `workers/api/test/unit/`
- **Tools**: Vitest with direct function calls
- **Coverage**: Validation, IP hashing, utility functions

### Integration Tests
- **Purpose**: Test full API workflows
- **Location**: `workers/api/test/integration/`
- **Tools**: Vitest with Miniflare emulation
- **Coverage**: Complete user flows with mocked Cloudflare services

## Quick Start

### Prerequisites

- **Node.js**: v18 or later
- **Cloudflare Wrangler**: `npm install -g wrangler`
- **Cloudflare Account**: For API tokens (optional for local testing)

### Local Testing Setup

```bash
# 1. Navigate to API directory
cd workers/api

# 2. Install dependencies
npm install

# 3. Run all tests
npm test
# → Runs 58 tests total

# 4. Run tests in watch mode (development)
npx vitest
# → Re-runs tests on file changes
```

## Running Tests

### Run All Tests
```bash
cd workers/api
npm test
# → Runs all 58 tests (unit + integration)
```

### Run Specific Test Files
```bash
cd workers/api

# Unit tests
npx vitest run test/unit/validation.test.js
npx vitest run test/unit/ip.test.js

# Integration tests
npx vitest run test/integration/submit.test.js
npx vitest run test/integration/turnstile.test.js
npx vitest run test/integration/ratelimit.test.js
```

### Test Categories

| Category | Files | Tests | Purpose |
|----------|-------|-------|---------|
| Unit | `test/unit/validation.test.js` | 36 | Input validation, business logic |
| Unit | `test/unit/ip.test.js` | 4 | IP hashing, security functions |
| Integration | `test/integration/submit.test.js` | 11 | Complete submission workflow |
| Integration | `test/integration/turnstile.test.js` | 4 | CAPTCHA validation |
| Integration | `test/integration/ratelimit.test.js` | 3 | Rate limiting logic |

## Test Structure

### Unit Test Structure

```javascript
// Example unit test structure
test('validates notebook title', () => {
  const result = validateTitle('My Awesome Notebook');
  expect(result.isValid).toBe(true);
  expect(result.error).toBeNull();
});

test('rejects empty title', () => {
  const result = validateTitle('');
  expect(result.isValid).toBe(false);
  expect(result.error).toContain('Title is required');
});
```

### Integration Test Structure

```javascript
// Example integration test structure
import { handleSubmit } from '../../src/handlers/submit';

test('complete notebook submission flow', async () => {
  const request = new Request('http://localhost:8787/api/notebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Notebook',
      description: 'Test description',
      url: 'https://example.com'
    })
  });

  const response = await handleSubmit(request, {
    TURNSTILE_SECRET_KEY: 'test-secret',
    TURNSTILE_SITE_KEY: 'test-site-key',
    D1: mockD1,
    R2: mockR2,
    RATE_LIMIT_STORE: mockRateLimitStore
  });

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
});
```

## Test Environment

### Miniflare Emulation

Integration tests use Miniflare to emulate Cloudflare services:

- **D1**: SQLite database emulation
- **R2**: S3-compatible storage emulation
- **Turnstile**: Dev mode bypass when secret key not set
- **Rate Limiting**: In-memory store with seeded data

### Test Configuration

```javascript
// vitest.config.mjs
export default {
  test: {
    globals: true,
    environment: 'miniflare',
    miniflare: {
      bindings: {
        // Test-specific bindings
      }
    }
  }
};
```

## Test Coverage

### Unit Test Coverage

| Function | Tests | Coverage |
|----------|-------|----------|
| `validateTitle()` | 12 | Title validation |
| `validateDescription()` | 8 | Description validation |
| `validateUrl()` | 10 | URL validation |
| `validateCategories()` | 4 | Category validation |
| `validateTags()` | 2 | Tag validation |
| `hashIp()` | 4 | IP hashing |

### Integration Test Coverage

| Test File | Scenarios | Coverage |
|-----------|-----------|----------|
| `submit.test.js` | 11 | Full submission flow |
| `turnstile.test.js` | 4 | CAPTCHA validation |
| `ratelimit.test.js` | 3 | Rate limiting |

## Test Data

### Mock Data

```javascript
// Test data for unit tests
const validNotebook = {
  title: 'Valid Title',
  description: 'Valid description',
  url: 'https://example.com',
  categories: ['tech', 'education'],
  tags: ['ai', 'ml']
};

const invalidNotebook = {
  title: '',
  description: '',
  url: 'not-a-url',
  categories: [],
  tags: []
};
```

### Seeded Rate Limit Data

```javascript
// Seeded data for rate limiting tests
const rateLimitSeed = {
  '192.168.1.1': [
    { timestamp: Date.now() - 3600000, count: 1 } // 1 hour ago
  ],
  '10.0.0.1': [
    { timestamp: Date.now() - 1800000, count: 2 } // 30 minutes ago
  ]
};
```

## Test Development

### Adding New Tests

#### Unit Tests

1. **Identify function to test** in `workers/api/src/utils/`
2. **Create test file** in `workers/api/test/unit/`
3. **Write test cases** for happy path and edge cases
4. **Run tests** to verify coverage
5. **Commit** with conventional commit format

#### Integration Tests

1. **Identify workflow** to test
2. **Create test file** in `workers/api/test/integration/`
3. **Mock Cloudflare services** as needed
4. **Test complete flow** from request to response
5. **Run tests** to verify integration

### Test Best Practices

#### Unit Test Practices

- **Test pure functions** in isolation
- **Cover all code paths** (happy path + error cases)
- **Use descriptive test names**
- **Keep tests independent**
- **Mock external dependencies**

#### Integration Test Practices

- **Test real workflows** end-to-end
- **Mock Cloudflare services** appropriately
- **Use realistic data** and edge cases
- **Test error scenarios** and recovery
- **Verify API responses** match expectations

## Test Results

### Local Test Results

```bash
# Run tests and see results
cd workers/api
npm test

# Expected output:
# ✓ validation.test.js
# ✓ ip.test.js
# ✓ submit.test.js
# ✓ turnstile.test.js
# ✓ ratelimit.test.js
# All tests passed (58/58)
```

### CI/CD Test Results

GitHub Actions runs tests on every pull request:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd workers/api && npm ci
      - run: cd workers/api && npm test
```

## Debugging Tests

### Common Test Issues

#### Test Not Running
```bash
# Check if vitest is installed
npx vitest --version

# Check if test files exist
ls workers/api/test/unit/
ls workers/api/test/integration/
```

#### Test Failing
```bash
# Run specific failing test
npx vitest run workers/api/test/unit/validation.test.js

# Run all tests with verbose output
npm test -- --verbose
```

#### Miniflare Issues
```bash
# Check Miniflare installation
npx miniflare --version

# Check Cloudflare bindings
wrangler dev --var TEST_VAR=test
```

### Test Troubleshooting

#### Environment Issues
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Install dependencies
npm ci
```

#### Cloudflare Service Issues
```bash
# Check D1 connection
wrangler d1 execute notebooklm-marketplace --local --query "SELECT 1"

# Check R2 bucket
wrangler r2 bucket list

# Check Worker bindings
wrangler dev --inspect
```

## Test Maintenance

### Regular Test Maintenance

#### Monthly
- **Review test coverage** for new features
- **Update test data** if needed
- **Check for flaky tests**
- **Update test documentation**

#### Quarterly
- **Review test structure** for improvements
- **Add tests for new features**
- **Update test environment**
- **Check for deprecated APIs**

#### Yearly
- **Review testing strategy** for the year
- **Plan for new testing tools**
- **Update test documentation**
- **Evaluate test effectiveness**

### Test Performance

#### Optimize Tests
```bash
# Run tests with cache
npx vitest run --cache

# Run tests with coverage
npx vitest run --coverage

# Run tests with watch mode
npx vitest
```

#### Test Metrics
- **Test Count**: 58 tests
- **Unit Tests**: 40 tests (69%)
- **Integration Tests**: 18 tests (31%)
- **Test Coverage**: 100% for critical paths
- **Test Execution Time**: < 2 minutes locally

## Test Automation

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on:
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: workers/api/package-lock.json
      - name: Install dependencies
        run: cd workers/api && npm ci
      - name: Run tests
        run: cd workers/api && npm test
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results-${{ matrix.node-version }}
          path: workers/api/test-results/
```

### Local Automation

```bash
# Script to run all tests
cat > run-tests.sh << 'EOF'
#!/bin/bash
cd workers/api

echo "Running unit tests..."
npx vitest run test/unit/

if [ $? -eq 0 ]; then
  echo "Running integration tests..."
  npx vitest run test/integration/
  
  if [ $? -eq 0 ]; then
    echo "All tests passed!"
  else
    echo "Integration tests failed!"
    exit 1
  fi
else
  echo "Unit tests failed!"
  exit 1
fi
EOF

chmod +x run-tests.sh
```

## Test Reporting

### Test Reports

```bash
# Generate test report
npx vitest run --coverage

# Generate HTML report
npx vitest run --coverage --reporter=html

# Generate JSON report
npx vitest run --coverage --reporter=json
```

### Coverage Report

```bash
# Check coverage
cd workers/api
npx vitest run --coverage

# Expected coverage:
# - Unit tests: 100%
# - Integration tests: 100%
# - Overall: 100%
```

## Conclusion

The testing strategy provides comprehensive coverage for the NotebookLM Gallery API. With 58 tests total, covering both unit and integration tests, we ensure code quality and reliability.

Key testing practices:
- **Pure function testing** for unit tests
- **End-to-end testing** for integration tests
- **Miniflare emulation** for Cloudflare services
- **Comprehensive coverage** for all critical paths
- **CI/CD integration** for automated testing
- **Clear test structure** for maintainability

The testing approach ensures:
- **Code quality** through comprehensive unit tests
- **Integration reliability** through end-to-end tests
- **Performance** through optimized test execution
- **Maintainability** through clear test structure
- **Confidence** through 100% test coverage

This testing strategy provides the foundation for a reliable, maintainable API that can evolve with the project while maintaining high quality standards.