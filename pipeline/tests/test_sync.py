from datetime import date

import pytest

from unbox_box_pipeline.circuits import CircuitInfo, match_race
from unbox_box_pipeline.sessions import (
    SESSIONS,
    canonical_session,
    is_event_folder,
    parse_seasons,
    parse_sessions,
    upstream_names,
)
from unbox_box_pipeline.sync import plan_builds
from unbox_box_pipeline.writer import session_id


def test_sprint_shootout_is_sprint_qualifying():
    assert canonical_session("Sprint Shootout") == "Sprint Qualifying"
    assert canonical_session("sprint qualifying") == "Sprint Qualifying"
    assert canonical_session("Race") == "Race"
    assert "Sprint Shootout" in upstream_names("Sprint Qualifying")
    assert session_id(2023, "Austrian Grand Prix", "Sprint Qualifying") == (
        "2023-austrian-grand-prix-sq"
    )


def test_unknown_session_rejected():
    with pytest.raises(ValueError):
        canonical_session("Practice 1")


@pytest.mark.parametrize(
    ("name", "ok"),
    [
        ("Italian Grand Prix", True),
        ("70th Anniversary Grand Prix", True),
        ("São Paulo Grand Prix", True),
        (".github", False),
        ("cache", False),
        ("cache_preseason", False),
        ("fastf1_cache", False),
        ("schemas", False),
        ("Pre-Season Testing", False),
    ],
)
def test_event_folders(name, ok):
    assert is_event_folder(name) is ok


def test_parse_seasons_and_sessions():
    assert parse_seasons("2023-2026") == [2023, 2024, 2025, 2026]
    assert parse_seasons("2024,2026") == [2024, 2026]
    assert parse_sessions("q,r,s,sq") == ["Qualifying", "Race", "Sprint", "Sprint Qualifying"]
    assert parse_sessions("all") == list(SESSIONS)


def test_plan_skips_built_sessions_unless_forced():
    available = [
        (2025, "Italian Grand Prix", "Qualifying"),
        (2025, "Italian Grand Prix", "Race"),
    ]
    built = {"2025-italian-grand-prix-q"}
    assert plan_builds(available, built, force=False) == [(2025, "Italian Grand Prix", "Race")]
    assert plan_builds(available, built, force=True) == available


def test_match_race_by_date_window():
    races = [
        CircuitInfo(
            2025, 16, date(2025, 9, 7), "monza", "Autodromo Nazionale Monza", "Monza", "Italy"
        ),
        CircuitInfo(2025, 17, date(2025, 9, 21), "baku", "Baku City Circuit", "Baku", "Azerbaijan"),
    ]
    # Qualifying is the day before the race; sprint weekends start two days before.
    assert match_race(races, 2025, date(2025, 9, 6)).slug == "monza"
    assert match_race(races, 2025, date(2025, 9, 19)).slug == "baku"
    assert match_race(races, 2025, date(2025, 8, 1)) is None
    assert match_race(races, 2024, date(2025, 9, 6)) is None


def test_slugify_strips_accents():
    from unbox_box_pipeline.writer import slugify

    assert slugify("São Paulo Grand Prix") == "sao-paulo-grand-prix"
    assert session_id(2024, "São Paulo Grand Prix", "Race") == "2024-sao-paulo-grand-prix-r"


def test_driver_fallback_fills_missing_names_and_numbers():
    from unbox_box_pipeline.sources.tracinginsights import parse_driver

    directory = {"VER": ("1", "Max", "Verstappen")}
    full = {"driver": "HAM", "dn": 44, "fn": "Lewis", "ln": "Hamilton", "team": "Mercedes"}
    assert parse_driver(full, directory).last_name == "Hamilton"
    sparse = parse_driver({"driver": "VER", "team": "Red Bull Racing"}, directory)
    assert (sparse.number, sparse.first_name, sparse.last_name) == ("1", "Max", "Verstappen")
    unknown = parse_driver({"driver": "XYZ", "team": "Team"}, directory)
    assert (unknown.number, unknown.last_name) == ("", "XYZ")


def test_rebuild_index_keeps_published_sessions_and_prefers_local(tmp_path):
    import json

    from unbox_box_pipeline.writer import rebuild_index

    meta = {
        "id": "2026-dutch-grand-prix-q",
        "season": 2026,
        "round": 15,
        "event": "Dutch Grand Prix",
        "session": "Qualifying",
        "date": "2026-08-29",
        "circuit": {"name": "Circuit Zandvoort", "country": "Netherlands"},
    }
    (tmp_path / "sessions" / meta["id"]).mkdir(parents=True)
    (tmp_path / "sessions" / meta["id"] / "meta.json").write_text(json.dumps(meta))
    published = [
        {"id": "2025-italian-grand-prix-q", "date": "2025-09-06"},
        {"id": "2026-dutch-grand-prix-q", "date": "stale"},
    ]
    assert rebuild_index(tmp_path, published) == 2
    index = json.loads((tmp_path / "index.json").read_text())
    assert [s["id"] for s in index["sessions"]] == [
        "2026-dutch-grand-prix-q",
        "2025-italian-grand-prix-q",
    ]
    assert index["sessions"][0]["date"] == "2026-08-29"  # local build wins


def test_empty_telemetry_is_not_usable():
    import math

    from unbox_box_pipeline.build import usable
    from unbox_box_pipeline.model import Telemetry

    empty = Telemetry("AAA", 1, *([[math.nan]] * 12))
    full = Telemetry("AAA", 1, *([[float(i) for i in range(60)]] * 12))
    assert not usable(empty)
    assert usable(full)


def test_cache_files_are_unique_but_keep_a_prunable_prefix():
    from unbox_box_pipeline.http import _cache_file

    base = "https://raw.githubusercontent.com/TracingInsights/2025/main/" + "x" * 300
    a, b = _cache_file(base + "/1_tel.json"), _cache_file(base + "/2_tel.json")
    assert a != b
    assert a.name.startswith("https%3A%2F%2Fraw.githubusercontent.com")


def test_prune_removes_only_that_session(tmp_path, monkeypatch):
    import unbox_box_pipeline.http as http

    monkeypatch.setattr(http, "CACHE_DIR", tmp_path)
    keep = "https://raw.githubusercontent.com/TracingInsights/2025/main/Italian%20Grand%20Prix/Race/VER/1_tel.json"
    drop = "https://raw.githubusercontent.com/TracingInsights/2025/main/Italian%20Grand%20Prix/Qualifying/VER/1_tel.json"
    for url in (keep, drop):
        http._cache_file(url).write_text("{}")
    assert http.prune_cache(drop.rsplit("/VER", 1)[0] + "/") == 1
    assert http._cache_file(keep).exists() and not http._cache_file(drop).exists()


def test_dump_is_atomic_and_corrupt_meta_is_not_built(tmp_path):
    from unbox_box_pipeline.sync import built_ids
    from unbox_box_pipeline.writer import dump

    dump(tmp_path / "sessions" / "good" / "meta.json", {"id": "good"})
    bad = tmp_path / "sessions" / "bad" / "meta.json"
    bad.parent.mkdir(parents=True)
    bad.write_text('{"id": "ba')  # truncated by a crash
    assert built_ids(tmp_path) == {"good"}
    assert not list((tmp_path / "sessions" / "good").glob("*.tmp"))


def test_tracinginsights_licence_follows_the_season():
    from unbox_box_pipeline.sources.tracinginsights import season_license

    assert season_license(2023) == "MIT"
    assert season_license(2024) == "MIT"
    assert season_license(2025) == "Apache-2.0"
    assert season_license(2026) == "Apache-2.0"
