# Development Guide

## Quick Start

### Prerequisites

- **Node.js**: v18 or later
- **Wrangler CLI**: `npm install -g wrangler`
- **Cloudflare Account**: Free tier account (required for deployment)

### Local Development Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd notebooklm-marketplace

# 2. Install API dependencies
cd workers/api
npm install

# 3. Set up local database
cd workers/api
wrangler d1 create notebooklm-marketplace
# → Copy the database_id into wrangler.toml

# 4. Set up local storage
cd workers/api
wrangler r2 bucket create notebooklm-marketplace-previews

# 5. Start API locally
cd workers/api
wrangler dev
# → Available at http://localhost:8787

# 6. Start frontend locally (separate terminal)
cd frontend
python -m http.server 3000
# → Available at http://localhost:3000
```

## Project Structure

```
notebooklm-marketplace/
├── frontend/               # Cloudflare Pages site
│   ├── index.html          # Discover page (notebook grid)
│   ├── notebook.html       # Notebook detail page
│   ├── submit.html         # Submission form
│   ├── css/style.css       # Tailwind + custom styles
│   └── js/                 # Client-side JavaScript
├── workers/                 # Cloudflare Workers API
│   └── api/                # Cloudflare Workers API
│       ├── src/
│       │   ├── index.js    # Entry point + router
│       │   ├── db/schema.js
│       │   ├── handlers/   # Route handlers
│       │   ├── middleware/ # CORS, rate limit, Turnstile
│       │   └── utils/      # Validation, IP hashing
│       ├── test/
│       │   ├── unit/       # 2 files, 40 tests (pure functions)
│       │   └── integration/ # 3 files, 18 tests (Worker handlers)
│       ├── vitest.config.mjs
│       ├── wrangler.toml
│       └── package.json
├── docs/                   # Documentation (this directory)
├── openspec/               # SDD artifacts
└── .github/workflows/      # CI/CD workflows
```

## API Development

### Running the API

```bash
cd workers/api
wrangler dev
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notebooks` | List notebooks (paginated, filterable) |
| GET | `/api/notebooks/:id` | Get notebook detail |
| POST | `/api/notebooks` | Submit a new notebook |
| POST | `/api/notebooks/:id/like` | Toggle like on a notebook |
| GET | `/api/categories` | List categories with counts |
| GET | `/api/tags/trending` | List trending tags |

### Development Workflow

1. **Make changes** to `workers/api/src/` files
2. **Test locally** with `wrangler dev`
3. **Run tests** with `npm test`
4. **Check API** with curl or browser
5. **Commit changes** with conventional commits

### Testing

#### Run All Tests
```bash
cd workers/api
npm test
# → 58 tests total
```

#### Run Specific Test Files
```bash
cd workers/api
npx vitest run test/unit/validation.test.js
npx vitest run test/integration/submit.test.js
```

#### Test Layout

| Layer | File | Tests | Coverage |
|-------|------|-------|----------|
| Unit | `test/unit/validation.test.js` | 36 | Title, description, URL, categories, tags — every branch |
| Unit | `test/unit/ip.test.js` | 4 | Hash determinism, different IPs, hex format |
| Integration | `test/integration/submit.test.js` | 11 | Full submit flow: validation, Turnstile, rate limiting, image upload, CORS |
| Integration | `test/integration/turnstile.test.js` | 4 | Dev mode bypass, missing/invalid tokens |
| Integration | `test/integration/ratelimit.test.js` | 3 | Allow/block logic over the hourly window |

#### How Integration Tests Work

- **D1 and R2** are emulated via Miniflare (no real infrastructure needed)
- **Turnstile** uses its built-in dev mode: when `TURNSTILE_SECRET` is not set, verification passes automatically
- **Rate limiting** runs against an in-memory D1 with seeded log data
- Tests call handlers directly (`handleSubmit()`) with mocked `Request` and `env` objects

## Frontend Development

### Running the Frontend

```bash
cd frontend
python -m http.server 3000
# → Available at http://localhost:3000
```

### Frontend Files

- **`index.html`**: Discover page with notebook grid
- **`notebook.html`**: Individual notebook detail page
- **`submit.html`**: Form for submitting new notebooks
- **`css/style.css`**: Tailwind CSS + custom styles
- **`js/`**: Client-side JavaScript

### Frontend Development Workflow

1. **Edit HTML/CSS/JS** files in `frontend/`
2. **Test locally** with Python http.server
3. **Check API integration** with browser DevTools
4. **Verify Turnstile** protection
5. **Commit changes** with conventional commits

## Environment Setup

### Local Environment Variables

Create `.env` files in appropriate directories:

#### API Environment (`workers/api/.env`)
```bash
TURNSTILE_SECRET_KEY=your_secret_from_cloudflare_dashboard
```

#### Frontend Environment (`frontend/.env`)
```bash
TURNSTILE_SITE_KEY=your_site_key_from_cloudflare_dashboard
```

### Production Environment

Set up GitHub Actions secrets:

- **`CF_API_TOKEN`**: Cloudflare API token with Workers and Pages permissions

## CI/CD

### GitHub Actions Workflows

This repo includes two workflows:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `deploy.yml` | Push to `main` | Deploys the Worker and frontend to Cloudflare Pages |
| `test.yml` | Pull request to `main` | Runs all 58 tests with Node.js 20 |

### Running Tests Locally

```bash
cd workers/api
npm test
```

### Manual Testing

#### Test API Endpoints
```bash
# List notebooks
curl http://localhost:8787/api/notebooks

# Get specific notebook
curl http://localhost:8787/api/notebooks/{id}

# Submit a notebook (example)
curl -X POST http://localhost:8787/api/notebooks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "description": "Test description", "url": "https://example.com"}'
```

#### Test Frontend
1. Open browser to `http://localhost:3000`
2. Navigate through pages
3. Test submission form
4. Verify API integration

## Debugging

### Common Issues

#### API Not Starting
```bash
# Check if wrangler is installed
which wrangler

# Check local database
wrangler d1 list

# Check if port 8787 is available
netstat -tlnp | grep 8787
```

#### Frontend Not Loading
```bash
# Check Python server
cd frontend
python -m http.server 3000

# Check if API is running
curl http://localhost:8787/api/notebooks
```

#### Turnstile Not Working
```bash
# Check environment variables
cat workers/api/.env
ls frontend/.env

# Test Turnstile endpoint
curl http://localhost:8787/api/turnstile/verify -X POST -d '{"token":"test"}'
```

### Development Tips

#### Faster Testing
```bash
# Run only unit tests
npx vitest run test/unit/

# Run only integration tests
npx vitest run test/integration/

# Run tests in watch mode
npx vitest
```

#### Code Quality
```bash
# Check linting (if configured)
npx eslint workers/api/src/

# Check formatting (if configured)
npx prettier --check workers/api/src/
```

#### Database Migrations
```bash
# Apply migrations locally
cd workers/api
wrangler d1 migrations apply notebooklm-marketplace --local

# Check migration status
wrangler d1 migrations list notebooklm-marketplace --local
```

## Contributing

### Code Standards

- **Conventional Commits**: Use conventional commit format
- **ESLint**: Follow JavaScript linting rules
- **Prettier**: Use consistent code formatting
- **Tests**: Write comprehensive tests
- **Documentation**: Update documentation for changes

### Pull Request Process

1. **Create branch** from `main`
2. **Make changes** and commit with conventional commits
3. **Run tests** locally
4. **Create pull request** with description
5. **Request reviews** from maintainers
6. **Address feedback** if any
7. **Merge** after approval

### Review Checklist

- [ ] Code follows project conventions
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Changes are focused and minimal
- [ ] Edge cases covered
- [ ] Performance impact considered

## Project Maintenance

### Regular Tasks

#### Monthly
- **Review API usage** against free tier limits
- **Check for security updates** in dependencies
- **Clean up old data** if needed
- **Review and update documentation**

#### Quarterly
- **Test deployment** to staging environment
- **Review performance** and optimize if needed
- **Update dependencies** if security patches available
- **Review and update CI/CD workflows**

#### Yearly
- **Review architecture** for scalability
- **Plan for growth** beyond free tier
- **Document lessons learned**
- **Plan major upgrades**

### Backup and Recovery

#### Database Backup
```bash
cd workers/api
wrangler d1 export notebooklm-marketplace --local > backup.sql
```

#### Data Recovery
```bash
cd workers/api
wrangler d1 import notebooklm-marketplace --local < backup.sql
```

## Conclusion

This development guide provides everything needed to work with the NotebookLM Gallery project. The project uses modern development practices with clear separation between frontend and backend, comprehensive testing, and CI/CD integration.

Key development practices:
- **Local development** with wrangler dev and Python server
- **Comprehensive testing** with 58 tests covering all functionality
- **CI/CD integration** with GitHub Actions
- **Clear documentation** with quick start guides
- **Debugging tools** and troubleshooting guides

The development workflow is streamlined for productivity while maintaining code quality and test coverage.