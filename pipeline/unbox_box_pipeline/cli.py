"""Command line entry point for building session data (see README)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .build import build_session
from .circuits import f1db_driver_directory, load_f1db_races
from .history import build_history
from .outline import build_circuit_shapes, rebuild_outlines
from .sessions import canonical_session, parse_seasons, parse_sessions
from .sources import TracingInsightsSource

ROOT = Path(__file__).resolve().parents[2]
# Full archive: served from Hugging Face, never bundled into the static site.
ARCHIVE_OUT = ROOT / "data"
# Bundled demo data (Monza 2025) that ships inside the app.
BUNDLED_OUT = ROOT / "apps" / "web" / "public" / "data"
SOURCES = {"tracinginsights": TracingInsightsSource}


def main() -> None:
    parser = argparse.ArgumentParser(prog="unbox-box-pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    build = sub.add_parser("build", help="Build static data for one session")
    build.add_argument("--season", type=int, required=True)
    build.add_argument("--event", required=True, help='e.g. "Italian Grand Prix"')
    build.add_argument("--session", required=True, help='e.g. "Qualifying"')
    build.add_argument("--source", choices=sorted(SOURCES), default="tracinginsights")
    build.add_argument("--out", type=Path, default=ARCHIVE_OUT)
    build.add_argument("--step", type=float, default=5.0, help="Distance grid step in metres")

    history = sub.add_parser("history", help="Build all-time history data from F1DB")
    history.add_argument("--version", help="F1DB release tag, e.g. v2026.14.1 (default: latest)")
    history.add_argument("--out", type=Path, default=ARCHIVE_OUT)

    outlines = sub.add_parser(
        "outlines", help="Re-pick every built session's track outline from its stored laps"
    )
    outlines.add_argument("--out", type=Path, default=ARCHIVE_OUT)

    sync = sub.add_parser("sync", help="Build every published session not built yet")
    sync.add_argument("--seasons", default="2023-2026", help="e.g. 2023-2026 or 2024,2026")
    sync.add_argument("--sessions", default="q,r,s,sq", help="q,r,s,sq or all")
    sync.add_argument("--out", type=Path, default=ARCHIVE_OUT)
    sync.add_argument("--force", action="store_true", help="Rebuild sessions already built")
    sync.add_argument("--limit", type=int, help="Build at most N sessions this run")
    sync.add_argument("--keep-cache", action="store_true", help="Keep raw upstream files")
    sync.add_argument("--no-history", action="store_true", help="Skip the F1DB history build")
    sync.add_argument(
        "--publish", metavar="HF_REPO", help="Upload afterwards, e.g. you/unbox-box-data"
    )
    sync.add_argument(
        "--published-index",
        metavar="URL",
        help="Live index.json; its sessions count as built (for CI runs with an empty folder)",
    )

    publish = sub.add_parser("publish", help="Upload the data folder to a Hugging Face dataset")
    publish.add_argument("repo", help="Dataset repo id, e.g. your-name/unbox-box-data")
    publish.add_argument("--out", type=Path, default=ARCHIVE_OUT)

    args = parser.parse_args()

    if args.command == "history":
        print(json.dumps(build_history(args.out, args.version), indent=2))
    elif args.command == "outlines":
        changed = rebuild_outlines(args.out)
        shapes = build_circuit_shapes(args.out)
        print(
            json.dumps(
                {"changed": len(changed), "sessions": changed, "circuits": len(shapes)}, indent=2
            )
        )
    elif args.command == "build":
        report = build_session(
            SOURCES[args.source](f1db_driver_directory),
            args.season,
            args.event,
            canonical_session(args.session),
            args.out,
            args.step,
            races=load_f1db_races(),
        )
        print(json.dumps(report, indent=2))
    elif args.command == "sync":
        from .sync import sync as run_sync

        report = run_sync(
            args.out,
            parse_seasons(args.seasons),
            parse_sessions(args.sessions),
            force=args.force,
            limit=args.limit,
            keep_cache=args.keep_cache,
            with_history=not args.no_history,
            published_index=args.published_index,
        )
        print(f"Built {len(report['built'])}, failed {len(report['failed'])}")
        if args.publish:
            _publish(args.out, args.publish)
    elif args.command == "publish":
        _publish(args.out, args.repo)


def _publish(out: Path, repo: str) -> None:
    from .publish import publish

    url = publish(out, repo)
    print(f"Published. Set NEXT_PUBLIC_DATA_BASE={url}")


if __name__ == "__main__":
    main()
