# Changelog

All notable changes are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Changed

- Clean URLs: what a page shows is in the path (`/races/1988/3/qualifying/`,
  `/duel/2025-italian-grand-prix-q/LEC-16-vs-HAM-16/`, `/history/drivers/ayrton-senna/`), with
  view settings in the query. Older query links still open. Hosts rewrite deep paths to each
  view's page (Vercel, Netlify, Cloudflare Pages, `serve`), and the service worker caches one
  copy per view.
- The data build workflow uploads an artifact instead of pushing to `main`.

### Added

- Branch protection ruleset for `main`, a pull request workflow (commit and title lint,
  dependency review) and CodeQL for TypeScript, Python and the workflows.
- A deployment guide (`docs/deploy.md`) and a stricter contributing guide.

### Security

- GitHub Actions pinned to commit SHAs, checkouts without persisted credentials, job
  timeouts, `npm audit` in CI and `uv sync --locked` for the pipeline.

## [0.1.0] - 2026-09-24

### Added

- Lap Duel, Race Replay and Strategy Lab for every session since 2023 (TracingInsights).
- History Explorer, Race Archive, Circuits, Record Book, Engines & Tyres and Nations, covering
  every Grand Prix weekend since 1950 (F1DB).
- The Race Engineer: plain-English questions answered by 27 typed tools, offline, and the same
  tools for browser agents through WebMCP.
- Help & feedback with user and developer guides, and a bug-report form (Web3Forms).
- Offline support, installable app, dark and light themes, WCAG 2.1 AA.
- Security headers and a Content-Security-Policy for every host.
- Quality gates: Prettier, ESLint, TypeScript strict, CSpell, knip, Vitest with coverage gates,
  React Testing Library, Playwright (journeys, responsive matrix, axe accessibility, offline),
  Ruff and pytest; Git hooks with lint-staged and commitlint.
