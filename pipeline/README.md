# Unbox Box data pipeline

Builds the static JSON files the web app serves. Runs locally or in GitHub Actions.

## Keep every season up to date

```bash
uv run unbox-box-pipeline sync                      # 2023–2026: quali, race, sprint, sprint quali
uv run unbox-box-pipeline sync --seasons 2026       # just this season
uv run unbox-box-pipeline sync --limit 5            # at most five new sessions this run
```

`sync` finds every session TracingInsights has published, skips the ones already in `data/`
and builds the rest. Rerun it after each session to pull the latest data; one failing session
never stops the others and is retried on the next run. Raw upstream files are deleted after
each session builds (`--keep-cache` keeps them). A first full build of 2023–2026 takes about
three hours; later runs only fetch what's new.

Output goes to `data/` at the repo root (gitignored). It is not bundled into the static site:
the app reads it from `NEXT_PUBLIC_DATA_BASE`.

## Publish to Hugging Face

```bash
hf auth login                                      # once, with a write token
uv run --with 'huggingface_hub>=0.25,<2' unbox-box-pipeline publish your-name/unbox-box-data
```

Then build the app with
`NEXT_PUBLIC_DATA_BASE=https://huggingface.co/datasets/your-name/unbox-box-data/resolve/main`.
Hugging Face deduplicates uploads, so republishing only sends changed files.

`.github/workflows/sync-data.yml` does both every three hours on race weekends (daily midweek) once the repo is on GitHub
(needs the `HF_TOKEN` secret and `HF_DATASET` variable). It passes `--published-index` so a
fresh runner treats everything already on Hugging Face as built.

## Local development against the full archive

```bash
npm run data:serve     # serves data/ with CORS on :4100
npm run dev            # apps/web/.env.development.local points at :4100
```

Delete `apps/web/.env.development.local` to use the bundled Monza 2025 demo data instead.

## One session

```bash
uv run unbox-box-pipeline build --season 2025 --event "Italian Grand Prix" --session Qualifying
uv run pytest
```

## How it fits together

- Sources are adapters behind one `SessionSource` protocol (`unbox_box_pipeline/sources`). The
  default is TracingInsights (MIT for 2023–2024, Apache-2.0 from 2025; FastF1-derived).
- Session names are canonical (`sessions.py`): 2023's "Sprint Shootout" is stored as Sprint
  Qualifying (`-sq`).
- Each session is matched to its F1DB race by season and date (`circuits.py`) for the circuit
  name, place, country and round. F1DB also fills driver names and numbers when an upstream
  file lacks them. Hand-written files in `circuits/` add corner names and aliases.
- `index.json` is rebuilt from the session folders at the end of every sync.
