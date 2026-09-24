"""The rest of F1DB: every session of every weekend, entry lists, engines, tyres, nations,
families and record books. Called from `history.build_history`.

    data/history/seasons/<year>.json  one season: each weekend's sessions, entry list, stats
    data/history/records.json         leaderboards that need tables the app doesn't ship whole

Engines, tyres, team cars, families and countries go to `catalog.json` (see `catalog`)."""

from __future__ import annotations

import statistics
import zipfile
from collections import defaultdict
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .writer import dump

Reader = Callable[[str], list[dict[str, str]]]


def optional_reader(zf: zipfile.ZipFile, read: Callable) -> Reader:
    """Reads a table, or [] if this F1DB release (or a test fixture) doesn't have it."""
    names = set(zf.namelist())

    def reader(name: str) -> list[dict[str, str]]:
        return read(zf, name) if f"f1db-{name}.csv" in names else []

    return reader


def _int(value: str | None) -> int | None:
    return int(value) if value not in ("", None) else None


def _float(value: str | None) -> float | None:
    return float(value) if value not in ("", None) else None


def _true(value: str | None) -> bool:
    return value == "true"


class Ids:
    """Maps F1DB ids to the positions the index stores them at."""

    def __init__(self, **tables: list[dict[str, str]]):
        self.maps = {
            name: {r["id"]: i for i, r in enumerate(rows)} for name, rows in tables.items()
        }

    def __call__(self, table: str, key: str | None) -> int | None:
        return self.maps[table].get(key or "")


# --- index additions -------------------------------------------------------------------


def catalog(read: Reader, ids: Ids, countries: dict[str, dict[str, str]]) -> dict[str, Any]:
    """Engine and tyre makers, the countries everything refers to, driver families and each
    team's car per season."""
    code = lambda cid: countries[cid]["alpha2Code"] if cid in countries else None  # noqa: E731
    engine_seasons = read("seasons-engine-manufacturers")
    tyre_seasons = read("seasons-tyre-manufacturers")

    def years(rows: list[dict[str, str]], key: str) -> dict[str, tuple[int, int]]:
        span: dict[str, list[int]] = defaultdict(list)
        for r in rows:
            if _int(r.get("totalRaceStarts")):
                span[r[key]].append(int(r["year"]))
        return {k: (min(v), max(v)) for k, v in span.items()}

    engine_span = years(engine_seasons, "engineManufacturerId")
    tyre_span = years(tyre_seasons, "tyreManufacturerId")

    def maker(r: dict[str, str], span: dict[str, tuple[int, int]]) -> dict[str, Any]:
        first, last = span.get(r["id"], (None, None))
        return {
            "id": r["id"],
            "name": r["name"],
            "country": code(r.get("countryId", "")),
            "starts": _int(r.get("totalRaceStarts")) or 0,
            "wins": _int(r.get("totalRaceWins")) or 0,
            "podiums": _int(r.get("totalPodiums")) or 0,
            "poles": _int(r.get("totalPolePositions")) or 0,
            "fastestLaps": _int(r.get("totalFastestLaps")) or 0,
            "titles": _int(r.get("totalChampionshipWins")) or 0,
            "points": _float(r.get("totalPoints")) or 0.0,
            "firstYear": first,
            "lastYear": last,
        }

    def season_rows(rows: list[dict[str, str]], key: str, table: str) -> list[dict[str, Any]]:
        return [
            {
                "year": int(r["year"]),
                "maker": ids(table, r[key]),
                "pos": _int(r.get("positionNumber")),
                "starts": _int(r.get("totalRaceStarts")) or 0,
                "wins": _int(r.get("totalRaceWins")) or 0,
                "podiums": _int(r.get("totalPodiums")) or 0,
                "poles": _int(r.get("totalPolePositions")) or 0,
                "points": _float(r.get("totalPoints")),
            }
            for r in rows
            if ids(table, r[key]) is not None
        ]

    return {
        "engineMakers": [maker(r, engine_span) for r in read("engine-manufacturers")],
        "tyreMakers": [maker(r, tyre_span) for r in read("tyre-manufacturers")],
        "engineSeasons": season_rows(engine_seasons, "engineManufacturerId", "engine"),
        "tyreSeasons": season_rows(tyre_seasons, "tyreManufacturerId", "tyre"),
        "teamSeasons": team_seasons(read, ids),
        "family": [
            {
                "driver": ids("driver", r["driverId"]),
                "relative": ids("driver", r["parentDriverId"]),
                "type": r["type"],
            }
            for r in read("drivers-family-relationships")
            if ids("driver", r["driverId"]) is not None
            and ids("driver", r["parentDriverId"]) is not None
        ],
        "countries": [
            {
                "id": c["id"],
                "name": c["name"],
                "code": c["alpha2Code"],
                "demonym": c.get("demonym") or None,
                "continent": c.get("continentId") or None,
            }
            for c in countries.values()
        ],
    }


def team_seasons(read: Reader, ids: Ids) -> list[dict[str, Any]]:
    """What each team raced each year: chassis, engine and tyres (one row per team-year;
    entrants that ran the same constructor are merged)."""
    engines = {e["id"]: e for e in read("engines")}
    chassis = {c["id"]: c["name"] for c in read("chassis")}
    rows: dict[tuple[int, str], dict[str, Any]] = {}

    def row(r: dict[str, str]) -> dict[str, Any] | None:
        team = ids("constructor", r["constructorId"])
        if team is None:
            return None
        key = (int(r["year"]), r["constructorId"])
        if key not in rows:
            rows[key] = {
                "year": key[0],
                "constructor": team,
                "engineMaker": ids("engine", r["engineManufacturerId"]),
                "chassis": [],
                "engines": [],
                "tyres": [],
            }
        return rows[key]

    for r in read("seasons-entrants-constructors"):
        row(r)
    for r in read("seasons-entrants-chassis"):
        if (
            (x := row(r)) is not None
            and (name := chassis.get(r["chassisId"]))
            and name not in x["chassis"]
        ):
            x["chassis"].append(name)
    for r in read("seasons-entrants-engines"):
        e = engines.get(r["engineId"])
        if (x := row(r)) is not None and e:
            spec = {
                "name": e.get("fullName") or e["name"],
                "capacity": _float(e.get("capacity")),
                "layout": e.get("configuration") or None,
                "aspiration": e.get("aspiration") or None,
            }
            if spec not in x["engines"]:
                x["engines"].append(spec)
    for r in read("seasons-entrants-tyre-manufacturers"):
        tyre = ids("tyre", r["tyreManufacturerId"])
        if (x := row(r)) is not None and tyre is not None and tyre not in x["tyres"]:
            x["tyres"].append(tyre)
    return sorted(rows.values(), key=lambda x: (x["year"], x["constructor"]))


# --- per-season weekend files ----------------------------------------------------------

# F1DB table -> key in a weekend's `sessions`.
SESSION_TABLES = {
    "races-race-results": "race",
    "races-qualifying-results": "qualifying",
    "races-starting-grid-positions": "grid",
    "races-sprint-race-results": "sprint",
    "races-sprint-qualifying-results": "sprintQualifying",
    "races-sprint-starting-grid-positions": "sprintGrid",
    "races-qualifying-1-results": "qualifying1",
    "races-qualifying-2-results": "qualifying2",
    "races-pre-qualifying-results": "preQualifying",
    "races-free-practice-1-results": "fp1",
    "races-free-practice-2-results": "fp2",
    "races-free-practice-3-results": "fp3",
    "races-free-practice-4-results": "fp4",
    "races-warming-up-results": "warmup",
    "races-pit-stops": "pitStops",
    "races-fastest-laps": "fastestLaps",
    "races-driver-of-the-day-results": "driverOfTheDay",
}

SCHEDULE = {
    "fp1": "freePractice1",
    "fp2": "freePractice2",
    "fp3": "freePractice3",
    "fp4": "freePractice4",
    "preQualifying": "preQualifying",
    "qualifying1": "qualifying1",
    "qualifying2": "qualifying2",
    "qualifying": "qualifying",
    "sprintQualifying": "sprintQualifying",
    "sprint": "sprintRace",
    "warmup": "warmingUp",
}


def session_row(r: dict[str, str], ids: Ids) -> dict[str, Any]:
    """One line of any session table; keys that don't apply (or are blank) are left out."""
    row: dict[str, Any] = {
        "pos": _int(r.get("positionNumber")),
        "text": r.get("positionText") or None,
        "driver": ids("driver", r.get("driverId")),
        "team": ids("constructor", r.get("constructorId")),
        "engine": ids("engine", r.get("engineManufacturerId")),
        "tyre": ids("tyre", r.get("tyreManufacturerId")),
        "number": r.get("driverNumber") or None,
        "time": _int(r.get("timeMillis")),
        "gap": _int(r.get("gapMillis")),
        "gapLaps": _int(r.get("gapLaps")),
        "laps": _int(r.get("laps")),
        "q1": _int(r.get("q1Millis")),
        "q2": _int(r.get("q2Millis")),
        "q3": _int(r.get("q3Millis")),
        "grid": _int(r.get("gridPositionNumber")),
        "gridText": r.get("gridPositionText") or None,
        "qualified": _int(r.get("qualificationPositionNumber")),
        "penalty": r.get("gridPenalty") or None,
        "timePenalty": _int(r.get("timePenaltyMillis")),
        "points": _float(r.get("points")),
        "gained": _int(r.get("positionsGained")),
        "stops": _int(r.get("pitStops")),
        "retired": r.get("reasonRetired") or None,
        "stop": _int(r.get("stop")),
        "lap": _int(r.get("lap")),
        "percentage": _float(r.get("percentage")),
        "fastestLap": _true(r.get("fastestLap")) or None,
        "pole": _true(r.get("polePosition")) or None,
        "dotd": _true(r.get("driverOfTheDay")) or None,
        "grandSlam": _true(r.get("grandSlam")) or None,
        "shared": _true(r.get("sharedCar")) or None,
    }
    return {k: v for k, v in row.items() if v is not None}


def _stamp(race: dict[str, str], prefix: str) -> str | None:
    date = race.get(f"{prefix}Date")
    if not date:
        return None
    time = race.get(f"{prefix}Time")
    return f"{date}T{time}" if time else date


def build_seasons(
    out_dir: Path,
    read: Reader,
    ids: Ids,
    races: list[dict[str, str]],
    grands_prix: dict[str, dict[str, str]],
    countries: dict[str, dict[str, str]] | None = None,
) -> int:
    """Writes one file per season; returns the bytes written."""
    countries = countries or {}
    sessions: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    for table, key in SESSION_TABLES.items():
        for r in read(table):
            sessions[r["raceId"]][key].append(session_row(r, ids))

    by_year: dict[int, list[dict[str, str]]] = defaultdict(list)
    for r in races:
        by_year[int(r["year"])].append(r)

    entrants = {e["id"]: e["name"] for e in read("entrants")}
    stats = {
        "drivers": _by_year(read("seasons-drivers")),
        "constructors": _by_year(read("seasons-constructors")),
    }
    lineups = _by_year(read("seasons-entrants-drivers"))
    entrant_country = {
        (r["year"], r["entrantId"]): r["countryId"] for r in read("seasons-entrants")
    }

    size = 0
    for year, rows in sorted(by_year.items()):
        weekends = []
        for r in sorted(rows, key=lambda x: int(x["round"])):
            gp = grands_prix.get(r["grandPrixId"], {})
            weekends.append(
                {
                    "round": int(r["round"]),
                    "name": gp.get("name") or r["officialName"],
                    "fullName": gp.get("fullName") or None,
                    "officialName": r["officialName"],
                    "grandPrix": r["grandPrixId"],
                    "date": r["date"],
                    "time": r.get("time") or None,
                    "circuit": ids("circuit", r["circuitId"]),
                    "layout": r.get("circuitLayoutId") or None,
                    "courseLength": _float(r.get("courseLength")),
                    "laps": _int(r.get("laps")),
                    "scheduledLaps": _int(r.get("scheduledLaps")),
                    "distance": _float(r.get("distance")),
                    "qualifyingFormat": r.get("qualifyingFormat") or None,
                    "sprintFormat": r.get("sprintQualifyingFormat") or None,
                    "driversDecider": _true(r.get("driversChampionshipDecider")),
                    "constructorsDecider": _true(r.get("constructorsChampionshipDecider")),
                    "schedule": {
                        k: s for k, prefix in SCHEDULE.items() if (s := _stamp(r, prefix))
                    },
                    "sessions": dict(sessions.get(r["id"], {})),
                }
            )
        y = str(year)
        season = {
            "schemaVersion": 1,
            "year": year,
            "races": weekends,
            "entries": [
                {
                    "entrant": entrants.get(e["entrantId"], e["entrantId"]),
                    "country": countries.get(entrant_country.get((y, e["entrantId"]), ""), {}).get(
                        "alpha2Code"
                    ),
                    "constructor": ids("constructor", e["constructorId"]),
                    "engine": ids("engine", e["engineManufacturerId"]),
                    "driver": ids("driver", e["driverId"]),
                    "rounds": e.get("roundsText") or None,
                    "test": _true(e.get("testDriver")),
                }
                for e in lineups.get(y, [])
                if ids("driver", e["driverId"]) is not None
            ],
            "drivers": [
                _season_stats(s, "driver", ids("driver", s["driverId"]))
                for s in stats["drivers"].get(y, [])
                if ids("driver", s["driverId"]) is not None
            ],
            "constructors": [
                _season_stats(s, "team", ids("constructor", s["constructorId"]))
                for s in stats["constructors"].get(y, [])
                if ids("constructor", s["constructorId"]) is not None
            ],
        }
        size += dump(out_dir / "history" / "seasons" / f"{year}.json", season)
    return size


def _by_year(rows: list[dict[str, str]]) -> dict[str, list[dict[str, str]]]:
    out: dict[str, list[dict[str, str]]] = defaultdict(list)
    for r in rows:
        out[r["year"]].append(r)
    return out


def _season_stats(s: dict[str, str], key: str, index: int | None) -> dict[str, Any]:
    row = {
        key: index,
        "pos": _int(s.get("positionNumber")),
        "entries": _int(s.get("totalRaceEntries")) or 0,
        "starts": _int(s.get("totalRaceStarts")) or 0,
        "wins": _int(s.get("totalRaceWins")) or 0,
        "podiums": _int(s.get("totalPodiums")) or 0,
        "poles": _int(s.get("totalPolePositions")) or 0,
        "fastestLaps": _int(s.get("totalFastestLaps")) or 0,
        "points": _float(s.get("totalPoints")) or 0.0,
        "laps": _int(s.get("totalRaceLaps")) or 0,
        "bestGrid": _int(s.get("bestStartingGridPosition")),
        "bestRace": _int(s.get("bestRaceResult")),
        "sprintWins": _int(s.get("totalSprintRaceWins")) or 0,
        "dotd": _int(s.get("totalDriverOfTheDay")),
        "grandSlams": _int(s.get("totalGrandSlams")),
        "oneTwos": _int(s.get("total1And2Finishes")),
    }
    return {k: v for k, v in row.items() if v is not None}


# --- record books ----------------------------------------------------------------------

LIMIT = 25


def build_records(out_dir: Path, read: Reader, ids: Ids, races: list[dict[str, str]]) -> int:
    """Leaderboards drawn from the big session tables, so the app needn't load them all."""
    race_by_id = {r["id"]: r for r in races}
    ref = lambda r: {"year": int(r["year"]), "round": int(r["round"])}  # noqa: E731
    results = read("races-race-results")

    # Winning margins: the gap from the winner to second place, same lap only.
    seconds = [
        r
        for r in results
        if r.get("positionNumber") == "2" and _int(r.get("gapMillis")) and not r.get("gapLaps")
    ]
    winners = {r["raceId"]: r for r in results if r.get("positionNumber") == "1"}

    def margin(r: dict[str, str]) -> dict[str, Any]:
        w = winners.get(r["raceId"], {})
        return {
            **ref(r),
            "driver": ids("driver", w.get("driverId")),
            "runnerUp": ids("driver", r["driverId"]),
            "value": int(r["gapMillis"]),
        }

    ordered = sorted(seconds, key=lambda r: int(r["gapMillis"]))
    closest = [margin(r) for r in ordered[:LIMIT]]
    biggest = [margin(r) for r in ordered[::-1][:LIMIT]]

    dotd = sorted(
        (
            r
            for r in read("races-driver-of-the-day-results")
            if r.get("positionNumber") == "1" and r.get("percentage")
        ),
        key=lambda r: -float(r["percentage"]),
    )[:LIMIT]

    grid_wins = sorted(
        (
            r
            for r in results
            if r.get("positionNumber") == "1" and _int(r.get("gridPositionNumber"))
        ),
        key=lambda r: -int(r["gridPositionNumber"]),
    )[:LIMIT]

    records = {
        "schemaVersion": 1,
        "closestFinishes": closest,
        "biggestWins": biggest,
        "winsFromFurthestBack": [
            {
                **ref(r),
                "driver": ids("driver", r["driverId"]),
                "value": int(r["gridPositionNumber"]),
            }
            for r in grid_wins
        ],
        "driverOfTheDayShare": [
            {**ref(r), "driver": ids("driver", r["driverId"]), "value": float(r["percentage"])}
            for r in dotd
        ],
        "pitCrews": pit_crews(read("races-pit-stops"), ids, race_by_id),
    }
    return dump(out_dir / "history" / "records.json", records)


def pit_crews(
    stops: list[dict[str, str]], ids: Ids, race_by_id: dict[str, dict[str, str]]
) -> list[dict[str, Any]]:
    """Each team's pit-lane time against the race's median, per season. F1DB records the
    whole pit-lane time, so raw times mostly measure pit-lane length; the gap to the race
    median cancels that. Stops more than 50% off the median (drive-throughs, repairs) are
    dropped."""
    by_race: dict[str, list[dict[str, str]]] = defaultdict(list)
    for s in stops:
        if _int(s.get("timeMillis")) and s["raceId"] in race_by_id:
            by_race[s["raceId"]].append(s)
    deltas: dict[tuple[int, str], list[int]] = defaultdict(list)
    for rows in by_race.values():
        median = statistics.median(int(s["timeMillis"]) for s in rows)
        for s in rows:
            t = int(s["timeMillis"])
            if abs(t - median) <= median * 0.5:
                deltas[(int(s["year"]), s["constructorId"])].append(t - median)
    return [
        {
            "year": year,
            "constructor": ids("constructor", team),
            "stops": len(values),
            "value": round(statistics.median(values)),
        }
        for (year, team), values in sorted(deltas.items())
        if len(values) >= 5 and ids("constructor", team) is not None
    ]
