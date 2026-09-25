# Security policy

Unbox Box is a static site: no accounts, no server of its own, no stored personal data. The
places a security problem could still matter are the data pipeline, the GitHub Actions
workflows, the feedback form and anything that renders data from upstream sources.

## Reporting a vulnerability

Please report privately through GitHub: **Security → Report a vulnerability** on this
repository. Don't open a public issue.

Include what you found, how to reproduce it, and what an attacker could do with it. You'll get
a reply within a week, and credit in the fix if you'd like it.

## Supported versions

Only the latest `main` is supported.

## How the project protects itself

- A strict Content Security Policy and security headers on every host
  ([ADR 0005](docs/adr/0005-security-headers-and-csp.md)); end-to-end tests fail on any
  violation.
- Every data file is validated with Zod before use, and no data is ever rendered as HTML.
- GitHub Actions are pinned to commit SHAs, run with read-only tokens, and are audited in CI
  by CodeQL; inputs reach shells through environment variables only.
- Dependabot, dependency review on every pull request, `npm audit` in CI, and secret scanning
  with push protection.
- `main` is protected: reviewed, squash-merged pull requests only
  ([.github/rulesets/main.json](.github/rulesets/main.json)).
