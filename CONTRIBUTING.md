# Contributing to Unbox Box

Thanks for helping. Bug fixes, features, data corrections and docs are all welcome.

## Before you start

- **Small fix?** Open a pull request.
- **Anything bigger** (a new view, a new data source, a change to the tool registry): open an
  issue first so we can agree the approach before you spend time on it.
- **Security problem?** Don't open a public issue; see [SECURITY.md](SECURITY.md).

## Good first issues

New here? Issues labelled
[good first issue](https://github.com/SunTribe1/unbox-box/labels/good%20first%20issue) are small
and self-contained; [help wanted](https://github.com/SunTribe1/unbox-box/labels/help%20wanted)
ones are bigger. Comment on an issue to say you're taking it, so two people don't do the same
work. Questions and ideas that aren't bugs are welcome in
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
npm install
npm run dev                      # http://localhost:3000, bundled Monza 2025 demo data
npx playwright install chromium  # once, for end-to-end tests
```

For the full archive locally: `npm run data:sync` then `npm run data:serve`
(see [pipeline/README.md](pipeline/README.md)).

## Where things live

| Path              | What                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js app. `src/features/<section>` per page, shared UI in `src/components`, state and data in `src/lib` |
| `packages/tools`  | Schemas, analysis, the typed tools, the command engine. No React                                           |
| `packages/webmcp` | The only code that touches the WebMCP browser API                                                          |
| `pipeline`        | Python data pipeline                                                                                       |
| `docs/adr`        | Architecture decisions. Add one for any decision that's hard to reverse                                    |

The in-app **Help → For developers** page covers the stack, data flow and WebMCP in more detail.

## Making a change

1. Sync with upstream (`git fetch upstream && git rebase upstream/main`), then branch:
   `feat/short-name` or `fix/short-name`.
2. Keep each pull request to one change. Write or update tests with it:
   - logic in `packages/tools` or `apps/web/src/lib`: a Vitest unit test
   - a user-visible flow: a Playwright test in `apps/web/e2e`
   - pipeline code: a pytest in `pipeline/tests`
3. Follow the house style:
   - TypeScript strict; no `any`. Validate external data with Zod.
   - Styling with Tailwind utilities and the tokens in `apps/web/src/app/globals.css`; no raw
     colour values in components.
   - Use the shadcn/ui components in `apps/web/src/components/ui` before writing new ones.
   - Animate only `transform` and `opacity`, with the presets in `src/lib/motion.ts`.
   - Copy follows [docs/brand-guidelines.md](docs/brand-guidelines.md): British English,
     plain words, sentence case.
4. Run the checks CI runs:

   ```bash
   npm run check          # format, lint, types, spelling, dead code, unit tests
   npm run test:coverage  # coverage gates
   npm run build && npm run test:e2e
   cd pipeline && uv run ruff check . && uv run pytest -q   # if you touched the pipeline
   ```

   New words the spell checker doesn't know (names, circuits) go in `.cspell/project-words.txt`.

5. Commit with [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
   `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`.
6. Push to your fork and open a pull request against `main`, with the template filled in and
   screenshots for UI changes at phone and desktop widths. CI must pass, and a maintainer
   reviews every pull request (see `.github/CODEOWNERS`).

## Licences and credit

This matters: Unbox Box is careful about what it uses.

- Only add code, data, fonts, icons or images whose licence allows it. Never add official
  Formula 1 or team photographs, logos or footage.
- Credit every new production dependency in `apps/web/src/app/credits/credits.ts`; a unit test
  fails if you don't. Run `npm run notices -w @unbox-box/web` to refresh
  `THIRD_PARTY_NOTICES.txt`.
- A new data source needs its licence, an attribution line and the changes we make recorded in
  `apps/web/public/data/DATA_LICENSE.md`.
- By contributing you agree your contribution is released under the project's
  [MIT License](LICENSE).

## Behaviour

Be kind and constructive; see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
