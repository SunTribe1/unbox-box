"""Builds every session that upstream has published and we haven't built yet.

Run it after each session (or on a schedule): already-built sessions are skipped, so a rerun
only downloads what's new. One failing session never stops the others; it's retried next run.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from .build import build_session
from .circuits import f1db_driver_directory, load_f1db_races
from .history import build_history
from .http import get_json, prune_cache
from .outline import build_circuit_shapes, rebuild_outlines
from .sources.tracinginsights import TracingInsightsSource
from .writer import rebuild_index, session_id

Key = tuple[int, str, str]


def _readable(meta: Path) -> bool:
    try:
        json.loads(meta.read_text())
        return True
    except (OSError, ValueError):
        return False


def built_ids(out_dir: Path) -> set[str]:
    """Sessions with a complete meta.json (written last); a corrupt one is rebuilt."""
    sessions = out_dir / "sessions"
    if not sessions.exists():
        return set()
    return {p.name for p in sessions.iterdir() if _readable(p / "meta.json")}


def plan_builds(available: list[Key], built: set[str], *, force: bool) -> list[Key]:
    return [k for k in available if force or session_id(*k) not in built]


def discover(source: TracingInsightsSource, seasons: list[int], sessions: list[str]) -> list[Key]:
    found: list[Key] = []
    for season in seasons:
        try:
            events = source.list_events(season)
        except (FileNotFoundError, RuntimeError) as error:
            print(f"  {season}: no archive ({error})", flush=True)
            continue
        for event in events:
            found += [(season, event, s) for s in sessions if source.has_session(season, event, s)]
        print(f"  {season}: {len(events)} events", flush=True)
    return found


def _published_file(index_url: str, name: str) -> dict[str, Any]:
    """Another file published next to index.json, or {} before the first publish."""
    try:
        return get_json(f"{index_url.rsplit('/', 1)[0]}/{name}", cache=False)
    except FileNotFoundError:
        return {}


def _published_sessions(url: str) -> list[dict[str, Any]]:
    try:
        return get_json(url, cache=False).get("sessions", [])
    except FileNotFoundError:
        return []  # first run: nothing published yet


def sync(
    out_dir: Path,
    seasons: list[int],
    sessions: list[str],
    *,
    force: bool = False,
    limit: int | None = None,
    keep_cache: bool = False,
    with_history: bool = True,
    published_index: str | None = None,
) -> dict[str, Any]:
    """`published_index`: URL of the live index.json. Sessions listed there count as built,
    so a CI run that starts with an empty folder only builds what's new."""
    source = TracingInsightsSource(f1db_driver_directory)
    published = _published_sessions(published_index) if published_index else []
    print("Discovering published sessions…", flush=True)
    built = built_ids(out_dir) | {e["id"] for e in published}
    todo = plan_builds(discover(source, seasons, sessions), built, force=force)
    if limit is not None:
        todo = todo[:limit]
    print(f"{len(todo)} session(s) to build", flush=True)

    races = load_f1db_races()
    done, failed = [], []
    for i, (season, event, session) in enumerate(todo, 1):
        label = f"[{i}/{len(todo)}] {season} {event} · {session}"
        started = time.monotonic()
        try:
            report = build_session(source, season, event, session, out_dir, races=races)
            done.append(report["id"])
            print(
                f"{label}: {report['bytes'] / 1e6:.1f} MB in {time.monotonic() - started:.0f}s",
                flush=True,
            )
        except Exception as error:  # noqa: BLE001 - reported and retried on the next run
            failed.append({"session": f"{season} {event} {session}", "error": str(error)})
            print(f"{label}: FAILED ({error})", flush=True)
        finally:
            if not keep_cache:
                prune_cache(source.session_prefix(season, event, session))

    # Outlines compare each session with the others at its circuit, so pick them once all
    # sessions are in (a session with sparse GPS borrows a sibling's shape).
    if done:
        outlines = rebuild_outlines(out_dir)
        print(f"Outlines: {len(outlines)} updated", flush=True)
        published_shapes = (
            _published_file(published_index, "circuits.json") if published_index else None
        )
        build_circuit_shapes(out_dir, published=published_shapes)
    sessions = rebuild_index(out_dir, published)
    print(f"Index: {sessions} sessions", flush=True)
    history = build_history(out_dir) if with_history else None
    report = {"built": done, "failed": failed, "history": history}
    (out_dir / "sync-report.json").write_text(json.dumps(report, indent=2))
    return report
