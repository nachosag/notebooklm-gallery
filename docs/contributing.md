# Contributing Guide

## Welcome to NotebookLM Gallery

Thank you for your interest in contributing to the NotebookLM Gallery! This guide provides everything you need to contribute effectively to the project.

## Quick Start

### Prerequisites

- **Git**: Latest version
- **Node.js**: v18 or later
- **Cloudflare Account**: Free tier account (optional for local development)

### Getting Started

```bash
# 1. Fork the repository
git clone <your-fork-url>
cd notebooklm-marketplace

# 2. Set up local development
# API development
cd workers/api
npm install

# Frontend development (separate terminal)
cd frontend
# No dependencies needed for static site
```

## Contribution Types

### Code Contributions
- **Bug fixes**: Fix issues in the codebase
- **Features**: Add new functionality
- **Documentation**: Update documentation
- **Tests**: Add or improve tests
- **Performance**: Optimize code and workflows

### Non-Code Contributions
- **Documentation**: Improve guides and README files
- **Design**: Improve UI/UX and visual design
- **Testing**: Improve test coverage and strategies
- **Community**: Help with issues and discussions
- **Translation**: Add support for new languages

## Project Structure

```
notebooklm-marketplace/
├── frontend/               # Cloudflare Pages site
│   ├── index.html          # Discover page
│   ├── notebook.html       # Notebook detail page
│   ├── submit.html         # Submission form
│   ├── css/style.css       # Tailwind CSS
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
│       │   ├── unit/       # Unit tests
│       │   └── integration/ # Integration tests
│       ├── vitest.config.mjs
│       ├── wrangler.toml
│       └── package.json
├── docs/                   # Documentation (this directory)
├── openspec/               # SDD artifacts
└── .github/workflows/      # CI/CD workflows
```

## Contribution Workflow

### 1. Find an Issue

Browse the repository issues and look for:

- **Good first issues**: Tagged for beginners
- **Help wanted**: Active community requests
- **Documentation**: Missing or outdated documentation
- **Bugs**: Reported issues needing fixes

### 2. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

#### Code Changes

1. **Follow project conventions**:
   - Use conventional commits
   - Follow ESLint rules
   - Use Prettier formatting
   - Write comprehensive tests

2. **Test your changes**:
   ```bash
   cd workers/api
   npm test
   ```

3. **Check linting**:
   ```bash
   npx eslint workers/api/src/
   ```

#### Documentation Changes

1. **Update relevant documentation**:
   - API documentation
   - Development guides
   - README files
   - Comments in code

2. **Follow documentation style**:
   - Use clear headings
   - Provide examples
   - Include code snippets
   - Add links to related resources

### 4. Submit a Pull Request

#### PR Checklist

- [ ] **Code follows conventions**: Conventional commits, ESLint, Prettier
- [ ] **Tests pass**: All tests pass locally
- [ ] **Documentation updated**: Relevant documentation updated
- [ ] **No linting errors**: Code passes linting
- [ ] **Focused changes**: Changes are minimal and focused
- [ ] **Edge cases covered**: All edge cases tested
- [ ] **Performance considered**: Performance impact evaluated
- [ ] **Security reviewed**: Security implications considered

#### PR Description

Include the following in your PR description:

1. **Summary**: Brief description of changes
2. **Changes**: List of files changed
3. **Testing**: How to test the changes
4. **Screenshots**: Any UI changes
5. **Issues**: Related issues or PRs

### 5. Review Process

#### Code Review

Your PR will be reviewed by maintainers. The review process includes:

1. **Code Quality**: Code follows conventions and best practices
2. **Testing**: Tests pass and cover edge cases
3. **Documentation**: Documentation is clear and comprehensive
4. **Performance**: Performance impact is acceptable
5. **Security**: Security implications are addressed

#### Review Feedback

- **Address feedback**: Respond to reviewer comments
- **Make changes**: Implement requested changes
- **Update documentation**: Update documentation if needed
- **Rebase**: Rebase if necessary

### 6. Merge Process

#### Merge Criteria

- **All reviews passed**: All required reviews completed
- **Tests pass**: All tests pass in CI/CD
- **Documentation updated**: All relevant documentation updated
- **No conflicts**: No merge conflicts
- **Ready to merge**: PR is ready for merge

#### Merge Steps

1. **Squash commits**: Squash all commits into one
2. **Add co-authored-by**: Add co-authored-by: openhands <openhands@all-hands.dev>
3. **Merge**: Merge the PR
4. **Deploy**: Deploy changes to production (if applicable)

## Contribution Guidelines

### Code Standards

#### Conventional Commits

Use conventional commit format:

```
<type>(<scope>): <description>

<body>

<footer>
```

Types:

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding tests
- **chore**: Maintenance tasks

Examples:

```
feat(api): add notebook validation
fix(frontend): fix submit form submission
 docs(api): update API documentation
 style: format code with Prettier
 refactor(api): improve validation logic
 perf(api): optimize database queries
 test(api): add unit tests for validation
 chore: update dependencies
```

#### ESLint Rules

Follow ESLint rules:

```bash
npx eslint workers/api/src/
```

#### Prettier Formatting

Use Prettier formatting:

```bash
npx prettier --write workers/api/src/
```

### Testing Standards

#### Unit Tests

- **Test pure functions** in isolation
- **Cover all code paths** (happy path + error cases)
- **Use descriptive test names**
- **Keep tests independent**
- **Mock external dependencies**

#### Integration Tests

- **Test complete workflows**
- **Mock Cloudflare services**
- **Use realistic data**
- **Test error scenarios**
- **Verify API responses**

### Documentation Standards

#### Documentation Style

- **Clear headings**: Use clear, descriptive headings
- **Examples**: Provide code examples
- **Links**: Add links to related resources
- **Consistency**: Maintain consistent formatting
- **Completeness**: Document all important details

#### API Documentation

- **Clear descriptions**: Clear descriptions of endpoints
- **Examples**: Request/response examples
- **Error handling**: Document error cases
- **Parameters**: Document all parameters
- **Responses**: Document all response formats

## Project-Specific Guidelines

### API Development

#### API Development Workflow

1. **Make changes** to `workers/api/src/`
2. **Run tests** with `npm test`
3. **Test API** with curl or browser
4. **Update documentation** as needed
5. **Commit changes** with conventional commits

#### API Testing

- **Unit tests**: Test validation functions
- **Integration tests**: Test complete workflows
- **Local testing**: Test with curl
- **CI/CD testing**: Test in GitHub Actions

### Frontend Development

#### Frontend Development Workflow

1. **Edit HTML/CSS/JS** in `frontend/`
2. **Test locally** with Python server
3. **Check API integration** with browser DevTools
4. **Verify Turnstile** protection
5. **Commit changes** with conventional commits

#### Frontend Testing

- **Manual testing**: Test in browser
- **API integration**: Verify API calls
- **Responsive design**: Test on different devices
- **Accessibility**: Test with screen readers

## Project Management

### GitHub Projects

Este proyecto usa **GitHub Projects** (kanban) para trackear todo el trabajo: features, bugs, deudas técnicas, tareas de infraestructura, etc.

**Tablero:** https://github.com/users/nachosag/projects/3

#### Flujo de trabajo en el Project

| Columna | Cuándo se usa |
|---------|---------------|
| `Backlog` | Ideas, tareas sin priorizar, backlog largo |
| `To Do` | Tareas listas para empezar, priorizadas |
| `In Progress` | Alguien está trabajando activamente |
| `Done` | Completado, merged o cerrado |

#### Issues y etiquetas

- Cada pieza de trabajo tiene su **issue** en el repo
- Etiquetas estándar:
  - `deuda técnica` — refactors, duplicación, tech debt
  - `arquitectura` — decisiones de arquitectura
  - `infraestructura` — CI/CD, tooling, config
  - `setup` — tareas de setup inicial
  - `bug` — errores en producción
  - `feature` — nueva funcionalidad
  - `docs` — documentación

#### Convención de commits y PRs

- Usar **conventional commits** (ya documentado arriba)
- En el mensaje del commit o PR, referenciar el issue:
  - `fixes #4` → cierra el issue #4 al mergear
  - `refs #5` → referencia el issue #5 sin cerrarlo

#### Pull Requests

- Cada PR debe referenciar al menos un issue (`fixes #4` o `refs #5`)
- El Project mueve automáticamente el issue a `In Progress` cuando se abre un PR vinculado
- Al mergear, el issue se mueve a `Done`

---

## Community Guidelines

### Code of Conduct

Follow the project's code of conduct:

- **Be respectful**: Treat all contributors with respect
- **Be collaborative**: Work together to solve problems
- **Be inclusive**: Welcome new contributors
- **Be professional**: Maintain professional standards

### Communication

- **Be clear**: Communicate clearly and concisely
- **Be timely**: Respond to issues and PRs promptly
- **Be helpful**: Help new contributors when possible
- **Be supportive**: Support other contributors

## Getting Help

### Questions

- **GitHub Discussions**: Ask questions in discussions
- **Issues**: Create issues for questions
- **Pull Requests**: Submit pull requests for code changes

### Bug Reports

- **Create issues**: Create issues for bugs
- **Provide details**: Provide detailed bug reports
- **Include steps**: Include steps to reproduce bugs

### Feature Requests

- **Create issues**: Create issues for feature requests
- **Provide details**: Provide detailed feature requests
- **Discuss**: Discuss feature requests with maintainers

## Contribution Recognition

### Credits

Contributors are recognized in:

- **README files**: Acknowledgment in README
- **CHANGELOG**: Changelog entries
- **Release notes**: Release notes
- **Documentation**: Documentation credits

### Awards

- **Contributor badges**: Badges for significant contributions
- **Pull request reviews**: Recognition for PR reviews
- **Documentation improvements**: Recognition for documentation
- **Testing improvements**: Recognition for testing

## Conclusion

Contributing to the NotebookLM Gallery is a rewarding experience. By following these guidelines, you can contribute effectively and help make the project better for everyone.

Key contribution practices:
- **Follow project conventions**: Follow project conventions and standards
- **Test thoroughly**: Test changes thoroughly
- **Document well**: Document changes well
- **Be collaborative**: Work collaboratively with other contributors
- **Be professional**: Maintain professional standards

The contribution process is designed to:
- **Guide contributors**: Provide clear guidance for contributors
- **Ensure quality**: Ensure high-quality contributions
- **Maintain consistency**: Maintain consistency across the project
- **Support growth**: Support growth of contributors
- **Recognize contributions**: Recognize contributions

This contributing guide provides everything needed to contribute effectively to the NotebookLM Gallery project. By following these guidelines, you can make meaningful contributions that improve the project for everyone.

Remember: **Every contribution matters**. Whether it's a bug fix, a new feature, or documentation improvement, your contributions help make the project better.

Happy contributing! 🎉