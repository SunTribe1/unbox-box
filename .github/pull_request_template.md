<!-- The title must be a Conventional Commit, e.g. "fix(web): keep the corner when switching laps".
     It becomes the squash commit on main. See CONTRIBUTING.md. -->

## What and why

<!-- One change per pull request. Link the issue it closes: Closes #123 -->

Closes #

## How it was tested

- [ ] `npm run check`
- [ ] `npm run test:coverage`
- [ ] `npm run build && npm run test:e2e`
- [ ] Pipeline: `uv run ruff check . && uv run ruff format --check . && uv run pytest -q` (if touched)
- [ ] New or changed behaviour has a test that fails without this change

## Screenshots

<!-- UI changes: phone (390 px) and desktop, light and dark. -->

## Checklist

- [ ] Works by keyboard, at 320 px wide, and in both themes (WCAG 2.1 AA)
- [ ] No secrets, tokens, keys, `.env` files or personal data in the diff
- [ ] New dependencies, data or assets have a permissive licence and are credited
      (`apps/web/src/app/credits/credits.ts`, `DATA_LICENSE.md`)
- [ ] No new network hosts, or they are added to `apps/web/scripts/security-policy.mjs` with a reason
- [ ] Docs updated (README, Help, ADR, CHANGELOG) if behaviour changed
