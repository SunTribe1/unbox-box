"""All-time history from F1DB (https://github.com/f1db/f1db, CC BY 4.0, by Marcel Overdijk
and contributors). Downloads the CSV release once (cached) and writes two compact files:

    data/history/index.json    drivers with career totals, circuits, races, champions
    data/history/results.json  every race result as parallel arrays (columnar = small)
    data/history/standings.json official championship standings after every round
    data/history/catalog.json   engine and tyre makers, team cars by season, families, countries

plus the per-season weekend files and record books written by `archive`.
"""

from __future__ import annotations

import csv
import io
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any

from . import USER_AGENT
from .archive import Ids, build_records, build_seasons, catalog, optional_reader
from .http import CACHE_DIR
from .writer import dump

F1DB_URL = "https://github.com/f1db/f1db/releases/download/{version}/f1db-csv.zip"
LATEST_URL = "https://github.com/f1db/f1db/releases/latest/download/f1db-csv.zip"

# Rows that are not race starts (did not qualify, did not start, did not pre-qualify...).
NON_STARTS = {"DNQ", "DNPQ", "DNS", "DNP"}


def download(version: str | None = None) -> tuple[zipfile.ZipFile, str]:
    """Returns the zip and the release tag it came from."""
    url = F1DB_URL.format(version=version) if version else LATEST_URL
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    cache = CACHE_DIR / f"f1db-{version or 'latest'}.zip"
    tag_file = cache.with_suffix(".tag")
    if not cache.exists():
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(request, timeout=120) as response:
            cache.write_bytes(response.read())
            final = response.geturl()
        tag_file.write_text(final.rstrip("/").split("/")[-2] if "/download/" in final else "latest")
    tag = tag_file.read_text().strip() if tag_file.exists() else (version or "latest")
    return zipfile.ZipFile(cache), tag


def read(zf: zipfile.ZipFile, name: str) -> list[dict[str, str]]:
    with zf.open(f"f1db-{name}.csv") as f:
        return list(csv.DictReader(io.TextIOWrapper(f, encoding="utf-8")))


def _int(value: str) -> int | None:
    return int(value) if value not in ("", None) else None


def _float(value: str) -> float:
    return float(value) if value else 0.0


def _float_or_none(value: str) -> float | None:
    return float(value) if value not in ("", None) else None


def lap_records(
    races: list[dict[str, str]],
    fastest: list[dict[str, str]],
    circuit_index: dict[str, int],
    driver_index: dict[str, int],
) -> list[dict[str, Any]]:
    """The race lap record per circuit layout: the fastest of every race's fastest lap.
    `current` marks the layout used most recently at that circuit (records on older layouts
    are history, not targets)."""
    race_by_id = {r["id"]: r for r in races}
    latest_layout: dict[str, tuple[str, str]] = {}
    for r in races:
        if r["circuitId"] not in latest_layout or r["date"] > latest_layout[r["circuitId"]][1]:
            latest_layout[r["circuitId"]] = (r.get("circuitLayoutId", ""), r["date"])
    best: dict[tuple[str, str], dict[str, str]] = {}
    for f in fastest:
        race = race_by_id.get(f["raceId"])
        if not race or f.get("positionNumber") != "1" or not f.get("timeMillis"):
            continue
        key = (race["circuitId"], race.get("circuitLayoutId", ""))
        if key not in best or int(f["timeMillis"]) < int(best[key]["timeMillis"]):
            best[key] = {**f, "year": race["year"]}
    return [
        {
            "circuit": circuit_index[circuit],
            "time": int(f["timeMillis"]) / 1000,
            "driver": driver_index[f["driverId"]],
            "year": int(f["year"]),
            "current": latest_layout.get(circuit, ("", ""))[0] == layout,
        }
        for (circuit, layout), f in sorted(best.items())
        if circuit in circuit_index and f["driverId"] in driver_index
    ]


def build_history(out_dir: Path, version: str | None = None) -> dict[str, Any]:
    zf, tag = download(version)
    optional = optional_reader(zf, read)
    countries = {c["id"]: c for c in read(zf, "countries")}
    drivers = read(zf, "drivers")
    constructors = read(zf, "constructors")
    circuits = read(zf, "circuits")
    grands_prix = {g["id"]: g for g in read(zf, "grands-prix")}
    results = read(zf, "races-race-results")
    standings = read(zf, "seasons-driver-standings")
    team_standings = read(zf, "seasons-constructor-standings")
    round_drivers = read(zf, "races-driver-standings")
    round_teams = read(zf, "races-constructor-standings")
    chronology = read(zf, "constructors-chronology")

    raced = {r["raceId"] for r in results}
    all_races = read(zf, "races")
    races = [r for r in all_races if r["id"] in raced]
    fastest = read(zf, "races-fastest-laps")
    race_index = {r["id"]: i for i, r in enumerate(races)}
    driver_index = {d["id"]: i for i, d in enumerate(drivers)}
    constructor_index = {c["id"]: i for i, c in enumerate(constructors)}
    circuit_index = {c["id"]: i for i, c in enumerate(circuits)}
    ids = Ids(
        driver=drivers,
        constructor=constructors,
        circuit=circuits,
        engine=optional("engine-manufacturers"),
        tyre=optional("tyre-manufacturers"),
    )

    seasons: dict[str, set[int]] = defaultdict(set)
    for r in results:
        if r["positionText"] not in NON_STARTS:
            seasons[r["driverId"]].add(int(r["year"]))
    latest = max(int(r["year"]) for r in races)

    def country(cid: str) -> str | None:
        c = countries.get(cid)
        return c["demonym"] if c else None

    def code(cid: str | None) -> str | None:
        c = countries.get(cid or "")
        return c["alpha2Code"] if c else None

    # Every layout a circuit has used, and the years it was raced.
    layouts: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))
    for r in races:
        if r.get("circuitLayoutId"):
            layouts[r["circuitId"]][r["circuitLayoutId"]].append(int(r["year"]))
    layout_facts = {x["id"]: x for x in optional("circuits-layouts")}

    index = {
        "schemaVersion": 1,
        "source": {
            "name": "F1DB",
            "version": tag,
            "url": "https://github.com/f1db/f1db",
            "license": "CC BY 4.0",
        },
        "latestSeason": latest,
        "drivers": [
            {
                "id": d["id"],
                "name": d["name"],
                "firstName": d["firstName"],
                "lastName": d["lastName"],
                "abbr": d["abbreviation"],
                "nationality": country(d["nationalityCountryId"]),
                "dob": d["dateOfBirth"] or None,
                "starts": int(d["totalRaceStarts"] or 0),
                "wins": int(d["totalRaceWins"] or 0),
                "podiums": int(d["totalPodiums"] or 0),
                "poles": int(d["totalPolePositions"] or 0),
                "fastestLaps": int(d["totalFastestLaps"] or 0),
                "titles": int(d["totalChampionshipWins"] or 0),
                "points": _float(d["totalPoints"]),
                "firstYear": min(seasons[d["id"]]) if seasons[d["id"]] else None,
                "lastYear": max(seasons[d["id"]]) if seasons[d["id"]] else None,
                "active": latest in seasons[d["id"]],
                "number": d.get("permanentNumber") or None,
                "birthplace": d.get("placeOfBirth") or None,
                "bestChampionship": _int(d.get("bestChampionshipPosition", "")),
                "grandSlams": int(d.get("totalGrandSlams") or 0),
                "fullName": d.get("fullName") or None,
                "dod": d.get("dateOfDeath") or None,
                "gender": d.get("gender") or None,
                "code": code(d["nationalityCountryId"]),
                "code2": code(d.get("secondNationalityCountryId")),
                "birthCountry": code(d.get("countryOfBirthCountryId")),
                "entries": int(d.get("totalRaceEntries") or 0),
                "laps": int(d.get("totalRaceLaps") or 0),
                "bestGrid": _int(d.get("bestStartingGridPosition", "")),
                "bestRace": _int(d.get("bestRaceResult", "")),
                "sprintStarts": int(d.get("totalSprintRaceStarts") or 0),
                "sprintWins": int(d.get("totalSprintRaceWins") or 0),
                "dotd": int(d.get("totalDriverOfTheDay") or 0),
            }
            for d in drivers
        ],
        "constructors": [
            {
                "id": c["id"],
                "name": c["name"],
                "fullName": c.get("fullName") or c["name"],
                "country": country(c.get("countryId", "")),
                "starts": int(c.get("totalRaceStarts") or 0),
                "wins": int(c.get("totalRaceWins") or 0),
                "oneTwos": int(c.get("total1And2Finishes") or 0),
                "podiums": int(c.get("totalPodiums") or 0),
                "poles": int(c.get("totalPolePositions") or 0),
                "fastestLaps": int(c.get("totalFastestLaps") or 0),
                "titles": int(c.get("totalChampionshipWins") or 0),
                "points": _float(c.get("totalPoints", "")),
                "bestChampionship": _int(c.get("bestChampionshipPosition", "")),
                "code": code(c.get("countryId")),
                "entries": int(c.get("totalRaceEntries") or 0),
                "laps": int(c.get("totalRaceLaps") or 0),
                "bestGrid": _int(c.get("bestStartingGridPosition", "")),
                "bestRace": _int(c.get("bestRaceResult", "")),
                "sprintWins": int(c.get("totalSprintRaceWins") or 0),
            }
            for c in constructors
        ],
        "constructorChampions": [
            {"year": int(s["year"]), "constructor": constructor_index[s["constructorId"]]}
            for s in team_standings
            if s["championshipWon"] == "true" and s["constructorId"] in constructor_index
        ],
        # Team lineage: every name a team raced under, e.g. Toleman -> Benetton -> Renault.
        "lineage": [
            {
                "parent": constructor_index[c["parentConstructorId"]],
                "constructor": constructor_index[c["constructorId"]],
                "from": int(c["yearFrom"]),
                "to": _int(c["yearTo"]),
            }
            for c in chronology
            if c["parentConstructorId"] in constructor_index
            and c["constructorId"] in constructor_index
        ],
        "circuits": [
            {
                "id": c["id"],
                "name": c["name"],
                "place": c["placeName"],
                "country": country(c["countryId"]),
                "fullName": c.get("fullName") or c["name"],
                "previousNames": c.get("previousNames") or None,
                "type": c.get("type") or None,
                "direction": c.get("direction") or None,
                "lat": _float_or_none(c.get("latitude", "")),
                "lng": _float_or_none(c.get("longitude", "")),
                "length": _float_or_none(c.get("length", "")),
                "turns": _int(c.get("turns", "")),
                "code": code(c.get("countryId")),
                "layouts": [
                    {
                        "id": layout,
                        "length": _float_or_none(layout_facts.get(layout, {}).get("length", "")),
                        "turns": _int(layout_facts.get(layout, {}).get("turns", "")),
                        "from": min(years),
                        "to": max(years),
                        "races": len(years),
                    }
                    for layout, years in sorted(layouts[c["id"]].items(), key=lambda kv: min(kv[1]))
                ],
            }
            for c in circuits
        ],
        "lapRecords": lap_records(races, fastest, circuit_index, driver_index),
        "calendar": [
            {
                "year": int(r["year"]),
                "round": int(r["round"]),
                "name": grands_prix[r["grandPrixId"]]["name"]
                if r["grandPrixId"] in grands_prix
                else r["officialName"],
                "circuit": circuit_index[r["circuitId"]],
                "date": r["date"],
            }
            for r in all_races
            if r["id"] not in raced and r["circuitId"] in circuit_index
        ],
        "races": {
            "year": [int(r["year"]) for r in races],
            "round": [int(r["round"]) for r in races],
            "name": [
                grands_prix[r["grandPrixId"]]["name"]
                if r["grandPrixId"] in grands_prix
                else r["officialName"]
                for r in races
            ],
            "circuit": [circuit_index[r["circuitId"]] for r in races],
            "date": [r["date"] for r in races],
            "laps": [_int(r.get("laps", "")) or 0 for r in races],
            "sprint": [1 if r.get("sprintRaceDate") else 0 for r in races],
            "decider": [1 if r.get("driversChampionshipDecider") == "true" else 0 for r in races],
        },
        "champions": [
            {"year": int(s["year"]), "driver": driver_index[s["driverId"]]}
            for s in standings
            if s["championshipWon"] == "true"
        ],
    }

    starts = [
        r for r in results if r["positionText"] not in NON_STARTS and r["raceId"] in race_index
    ]
    columns = {
        "schemaVersion": 1,
        "race": [race_index[r["raceId"]] for r in starts],
        "driver": [driver_index[r["driverId"]] for r in starts],
        "constructor": [constructor_index.get(r["constructorId"], -1) for r in starts],
        # Finishing position; 0 = not classified (see `status`).
        "pos": [_int(r["positionNumber"]) or 0 for r in starts],
        "status": [r["positionText"] if not r["positionNumber"] else "" for r in starts],
        "grid": [_int(r["gridPositionNumber"]) or 0 for r in starts],
        "points": [_float(r["points"]) for r in starts],
        "pole": [1 if r["polePosition"] == "true" else 0 for r in starts],
        "fastestLap": [1 if r["fastestLap"] == "true" else 0 for r in starts],
    }

    def after_each_round(rows: list[dict[str, str]], key: str, ids: dict[str, int]) -> dict:
        kept = [r for r in rows if r["raceId"] in race_index and r[key] in ids]
        return {
            "race": [race_index[r["raceId"]] for r in kept],
            "id": [ids[r[key]] for r in kept],
            "pos": [_int(r["positionNumber"]) or 0 for r in kept],
            "points": [_float(r["points"]) for r in kept],
        }

    round_standings = {
        "schemaVersion": 1,
        "drivers": after_each_round(round_drivers, "driverId", driver_index),
        "constructors": after_each_round(round_teams, "constructorId", constructor_index),
    }

    history_dir = out_dir / "history"
    size = (
        dump(history_dir / "index.json", index)
        + dump(history_dir / "results.json", columns)
        + dump(history_dir / "standings.json", round_standings)
        + dump(
            history_dir / "catalog.json", {"schemaVersion": 1, **catalog(optional, ids, countries)}
        )
        + build_seasons(out_dir, optional, ids, all_races, grands_prix, countries)
        + build_records(out_dir, optional, ids, races)
    )
    return {
        "version": tag,
        "drivers": len(drivers),
        "races": len(races),
        "results": len(starts),
        "bytes": size,
    }
