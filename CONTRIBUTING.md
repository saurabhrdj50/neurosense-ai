# Contributing to NeuroSense AI

Thank you for your interest in contributing to NeuroSense AI! This document outlines the conventions and workflow required to keep the codebase clean, consistent, and maintainable.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Branch Naming](#branch-naming)
4. [Commit Message Convention](#commit-message-convention)
5. [Code Style](#code-style)
6. [Pull Request Process](#pull-request-process)
7. [Issue Reporting](#issue-reporting)
8. [Testing](#testing)
9. [Documentation](#documentation)

---

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/neurosense-ai.git
   cd neurosense-ai
   ```
3. Create a new branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. Follow the [Quick Start in README.md](README.md#quick-start) to set up the development environment.

---

## Project Structure

```
neurosense-ai/
├── frontend/               # React 19 + Vite SPA
│   └── src/
│       ├── constants/      # Global constants (colours, labels, variants)
│       ├── features/       # Route-level feature modules (auth, dashboard…)
│       ├── components/     # Shared presentational components
│       │   ├── layout/     # Shell components (AppLayout, Sidebar, TopBar)
│       │   ├── ui/         # Atomic UI primitives (Button, GlassCard…)
│       │   └── cdss/       # Clinical decision support components
│       ├── context/        # React Context providers
│       ├── providers/      # Third-party query/state providers
│       ├── services/       # Data access and the demo dataset
│       └── config/         # API URL and endpoint constants
└── backend/
    └── app/
        ├── api/routes/     # Flask route blueprints
        ├── modules/        # Analysis modules (MRI, NLP, speech…)
        ├── services/       # Orchestrator, report, chatbot
        └── repositories/  # Data-access layer
```

### Folder Conventions

| Area | Rule |
|------|------|
| New UI primitive | Create in `components/ui/` |
| New route page | Create a folder in `features/<feature-name>/` |
| New CDSS component | Create in `components/cdss/` |
| New backend endpoint | Add a blueprint in `api/routes/` and register in `app/__init__.py` |
| New backend module | Create in `modules/<name>/` with `__init__.py` |
| Shared constants | Add to `frontend/src/constants/index.js` |

---

## Branch Naming

Use lowercase with hyphens. Prefix with the type of work:

| Prefix | Use For |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation updates |
| `refactor/` | Code cleanup without behaviour change |
| `test/` | Adding or updating tests |
| `chore/` | Build, tooling, or dependency updates |

**Examples:**
```
feat/dicom-mri-viewer
fix/auth-session-restore
docs/architecture-diagram
refactor/fusion-engine-weights
```

---

## Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE, Closes #123]
```

### Types

| Type | When to Use |
|------|------------|
| `feat` | A new user-facing feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semi-colons — no logic change |
| `refactor` | Code change that is neither a fix nor a feature |
| `test` | Adding missing tests or correcting existing ones |
| `chore` | Changes to the build process or auxiliary tools |
| `perf` | Performance improvements |

### Examples

```
feat(analysis): add handwriting tremor amplitude metric

fix(auth): restore session correctly on page refresh

docs(readme): add API reference table for /analysis endpoints

chore(deps): upgrade framer-motion to v12.38.0
```

---

## Code Style

### JavaScript / JSX

- **Formatter**: Prettier (settings in `.prettierrc` if present, else defaults)
- **Linter**: ESLint with the project `eslint.config.js`
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for JS strings, double quotes for JSX attributes
- **Semicolons**: Omitted (ASI)
- **Component files**: PascalCase (`MyComponent.jsx`)
- **Utility files**: camelCase (`formatDate.js`)
- **JSDoc**: Required on all exported functions, components, hooks, and context providers

```jsx
// ✅ Good
/**
 * @param {object} props
 * @param {string} props.label
 * @returns {JSX.Element}
 */
export default function Badge({ label }) { … }

// ❌ Bad — no JSDoc, unclear naming
export default function B({ l }) { … }
```

### Python

- **Formatter**: `black` (line length 100)
- **Linter**: `flake8` or `ruff`
- **Docstrings**: Google-style docstrings on all public functions and classes
- **Type hints**: Required on all function signatures
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes

```python
# ✅ Good
def classify_mri(image_path: str, confidence_threshold: float = 0.7) -> dict:
    """
    Classify a brain MRI scan using the EfficientNet-B0 model.

    Args:
        image_path: Absolute path to the MRI image file.
        confidence_threshold: Minimum confidence to return a prediction.

    Returns:
        dict with keys: stage, confidence, grad_cam_path.
    """
```

### CSS / Tailwind

- Prefer Tailwind utility classes for layout and spacing
- Use CSS custom properties (`var(--color-primary)`) for brand tokens — do **not** hardcode hex values
- New design tokens belong in `frontend/src/index.css`

### Accessibility

- Every icon-only button **must** have `aria-label`
- Interactive elements must be reachable via keyboard (`Tab`, `Enter`, `Space`)
- `<img>` elements must have `alt` text
- `<nav>` elements must have `aria-label`
- Colour contrast must meet WCAG 2.1 AA (4.5:1 for normal text)

---

## Pull Request Process

1. **Open an issue first** for any change that is non-trivial (new feature, significant refactor, dependency upgrade).
2. **One PR per concern** — do not mix unrelated changes in a single PR.
3. Ensure your branch is up to date with `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
4. Verify a clean production build before submitting:
   ```bash
   cd frontend && npm run build
   ```
5. Fill in the PR template (automatically loaded from `.github/PULL_REQUEST_TEMPLATE.md`).
6. Request a review from a maintainer.
7. PRs require **at least 1 approving review** before merge.
8. Maintainers will squash-merge PRs unless a merge commit is explicitly requested.

### PR Checklist

- [ ] Code compiles and builds without errors
- [ ] ESLint passes (`npm run lint`)
- [ ] JSDoc added to new exported symbols
- [ ] Accessibility attributes added where applicable
- [ ] `CHANGELOG.md` updated (under `[Unreleased]`)
- [ ] Documentation updated if applicable

---

## Issue Reporting

Use GitHub Issues to report bugs or request features.

### Bug Reports

Include:
- Browser and OS version
- Steps to reproduce
- Expected vs. actual behaviour
- Console errors (if any)
- Screenshot or recording (if applicable)

### Feature Requests

Include:
- Use case description
- Why this benefits clinical users
- Any prior art or reference implementations

---

## Testing

### Frontend

Currently there are no automated frontend tests. Contributions that add:
- **Unit tests** (Vitest + Testing Library) for utility functions and hooks
- **Integration tests** for key flows (login, analysis wizard, results render)

…are especially welcome.

### Backend

```bash
cd backend
python -m pytest tests/ -v --cov=app
```

All new backend endpoints **must** include at minimum:
- One happy-path test
- One error/validation test

---

## Documentation

- Update `README.md` if your change affects installation, configuration, or usage
- Update `CHANGELOG.md` under `[Unreleased]` for every user-facing change
- Update `ARCHITECTURE.md` if you change the data flow, module structure, or add a new route group
- JSDoc is required — see [Code Style](#code-style)

---

## Questions?

Open a [GitHub Discussion](https://github.com/saurabhrdj50/neurosense-ai/discussions) or contact the maintainer directly.

Thank you for making NeuroSense AI better. 🧠
