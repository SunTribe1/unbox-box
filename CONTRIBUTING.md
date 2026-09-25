# Contributing to Unbox Box

Thanks for helping. Bug fixes, features, data corrections and docs are all welcome. This guide
is strict on purpose: `main` is protected, every change goes through review and CI, and a pull
request that skips a step below will be asked to fix it before it is reviewed.

## Before you start

- **Small fix** (a typo, a clear bug with an obvious fix): open a pull request.
- **Anything bigger** (a new view, a new data source, a change to the tool registry, a new
  dependency): open an issue first and wait for a maintainer to agree the approach. Pull
  requests for large changes we have not agreed may be closed.
- **Security problem:** never open a public issue; see [SECURITY.md](SECURITY.md).
- **Taking an issue:** comment on it first so two people don't do the same work. Issues
  labelled [good first issue](https://github.com/SunTribe1/unbox-box/labels/good%20first%20issue)
  are small and self-contained. Questions and ideas that aren't bugs go in
  [Discussions](https://github.com/SunTribe1/unbox-box/discussions).

## Set up

Fork the repository on GitHub, then:

```bash
git clone https://github.com/<you>/unbox-box.git
cd unbox-box
git remote add upstream https://github.com/SunTribe1/unbox-box.git
```

Requires Node 22+ ([.nvmrc](.nvmrc)); [uv](https://docs.astral.sh/uv/) only for the data
pipeline.

```bash
npm install                      # also installs the Git hooks
npm run dev                      # http://localhost:3000, bundled Monza 2025 demo data
npx playwright install chromium  # once, for end-to-end tests
```

For the full archive locally: `npm run data:sync` then `npm run data:serve`
(see [pipeline/README.md](pipeline/README.md)). All settings are in
[apps/web/.env.example](apps/web/.env.example); copy it to `apps/web/.env.local`, which Git
ignores.

## Where things live

| Path                | What                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/web`          | Next.js app. `src/features/<section>` per page, shared UI in `src/components`, state and data in `src/lib` |
| `apps/web/scripts`  | Build scripts: security headers and host rewrites, third-party notices                                     |
| `packages/tools`    | Schemas, analysis, the typed tools, the command engine. No React                                           |
| `packages/webmcp`   | The only code that touches the WebMCP browser API                                                          |
| `pipeline`          | Python data pipeline                                                                                       |
| `docs/adr`          | Architecture decisions. Add one for any decision that's hard to reverse                                    |
| `docs/brand`        | Brand guidelines and the icon set                                                                          |
| `docs/deploy.md`    | Hosting and data set-up                                                                                    |
| `.github/rulesets`  | The branch protection ruleset for `main`                                                                   |
| `.github/workflows` | CI, pull request checks, CodeQL, data builds                                                               |

The in-app **Help → For developers** page covers the stack, data flow, URL scheme and WebMCP in
more detail.

## Making a change

1. **Branch from an up-to-date `main`:** `git fetch upstream && git rebase upstream/main`,
   then `git switch -c feat/short-name` (or `fix/`, `docs/`, `refactor/`, `test/`, `chore/`).
2. **One change per pull request.** Keep it reviewable: aim for under ~400 changed lines,
   excluding generated files and tests. Split larger work into a series.
3. **Tests are required** for every behaviour change, and coverage must not fall below the
   gates (tools 85%, WebMCP 85%, web `lib/` 80%):
   - logic in `packages/tools` or `apps/web/src/lib`: a Vitest unit test
   - a shared component: a React Testing Library test in `apps/web/test/components`
   - a user-visible flow: a Playwright test in `apps/web/e2e`
   - pipeline code: a pytest in `pipeline/tests`
   - a bug fix: a test that fails without the fix
4. **House style:**
   - TypeScript strict; no `any`, no non-null assertions on external data. Validate anything
     from the network with Zod.
   - Styling with Tailwind utilities and the tokens in `apps/web/src/app/globals.css`; no raw
     colour values in components.
   - Use the shadcn/ui components in `apps/web/src/components/ui` before writing new ones.
   - Animate only `transform` and `opacity`, with the presets in `src/lib/motion.ts`, and
     respect reduced motion.
   - Accessibility is not optional: WCAG 2.1 AA in both themes, every control reachable by
     keyboard with a visible focus ring, and a name for every control. The axe checks in
     `e2e/a11y*.spec.ts` must pass.
   - Every screen works from 320 px wide up; the responsive suite checks five widths.
   - Copy follows [docs/brand/guidelines.md](docs/brand/guidelines.md): British English,
     plain words, sentence case.
   - A new view needs its slug in `src/lib/routes.ts` **and** `scripts/host-routes.mjs` (a
     test checks they match), so its deep links work on every host.
5. **Run what CI runs** before you push:

   ```bash
   npm run check          # format, lint, types, spelling, dead code, unit tests
   npm run test:coverage  # coverage gates
   npm run build && npm run test:e2e
   cd pipeline && uv run ruff check . && uv run ruff format --check . && uv run pytest -q
   ```

   New words the spell checker doesn't know (names, circuits) go in
   `.cspell/project-words.txt`.

6. **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):
   `type(scope): summary` in lower case, where type is one of `feat`, `fix`, `refactor`,
   `docs`, `test`, `chore`, `perf`, `ci`, and scope is optional (`web`, `tools`, `webmcp`,
   `pipeline`). The commit-msg hook and CI both check every commit.
7. **Open the pull request** against `main` from your fork, with the template filled in, a
   linked issue (`Closes #123`) and screenshots at phone and desktop widths for UI changes. The
   pull request **title** must also be a Conventional Commit: it becomes the squash commit on
   `main`.

## What `main` requires

`main` is protected by the ruleset in [.github/rulesets/main.json](.github/rulesets/main.json).
A pull request can only merge when:

- every required check is green: commit messages and title, dependency review, format / lint /
  types / spelling / dead code / unit tests, Playwright, the pipeline tests and CodeQL;
- the branch is up to date with `main`;
- a code owner has approved it ([.github/CODEOWNERS](.github/CODEOWNERS)), and approved again
  after the last push (new commits dismiss earlier approvals);
- every review conversation is resolved.

Pull requests are **squash-merged**, which keeps history linear and signed. Nobody pushes to
`main` directly, force-pushes it or deletes it. Maintainers review within a few days; if a
review asks for changes, push new commits to the same branch rather than opening a new pull
request.

## Security and secrets

- Never commit secrets, tokens, keys, `.env` files or personal data. `apps/web/.env.local` is
  ignored by Git; public settings are documented in `.env.example` with placeholder values.
  GitHub secret scanning and push protection block known key formats.
- Never add code that renders user or data content as HTML, weakens the Content Security
  Policy, or adds a network host without a matching entry in
  `apps/web/scripts/security-policy.mjs` and a reason in the pull request.
- New dependencies must be actively maintained, permissively licensed (MIT, Apache-2.0, BSD,
  ISC and similar; no GPL or AGPL) and free of known vulnerabilities. Dependency review fails
  the pull request otherwise.
- Never copy code from projects whose licence is incompatible with MIT, including AGPL
  projects, even with changes.

## Licences and credit

Unbox Box is careful about what it uses.

- Only add code, data, fonts, icons or images whose licence allows it. Never add official
  Formula 1 or team photographs, logos or footage, or driver photographs.
- Credit every new production dependency in `apps/web/src/app/credits/credits.ts`; a unit test
  fails if you don't. Run `npm run notices -w @unbox-box/web` to refresh
  `THIRD_PARTY_NOTICES.txt`.
- A new data source needs its licence, an attribution line and the changes we make recorded in
  `apps/web/public/data/DATA_LICENSE.md` and on the Credits page.
- By contributing you agree your contribution is released under the project's
  [MIT License](LICENSE).

## Behaviour

Be kind and constructive; see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Maintainers may close
pull requests or issues that ignore this guide or the code of conduct.
