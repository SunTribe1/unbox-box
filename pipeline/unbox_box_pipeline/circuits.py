"""Circuit names, places and round numbers from F1DB (CC BY 4.0), matched to a session by
season and date. Hand-written configs in `pipeline/circuits/` add corner names and aliases."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

from .writer import slugify

CIRCUITS_DIR = Path(__file__).resolve().parent.parent / "circuits"
MATCH_WINDOW_DAYS = 3  # a weekend's sessions fall within three days of the race


@dataclass(frozen=True)
class CircuitInfo:
    season: int
    round: int
    race_date: date
    slug: str
    name: str
    place: str | None
    country: str | None


def load_f1db_races() -> list[CircuitInfo]:
    """Every race F1DB knows, including scheduled ones (reuses the cached release zip)."""
    from .history import download, read

    zf, _ = download()
    countries = {c["id"]: c["name"] for c in read(zf, "countries")}
    circuits = {c["id"]: c for c in read(zf, "circuits")}
    rows = []
    for race in read(zf, "races"):
        circuit = circuits.get(race["circuitId"])
        if not circuit or not race["date"]:
            continue
        rows.append(
            CircuitInfo(
                season=int(race["year"]),
                round=int(race["round"]),
                race_date=date.fromisoformat(race["date"]),
                slug=circuit["id"],
                name=circuit["fullName"] or circuit["name"],
                place=circuit["placeName"] or None,
                country=countries.get(circuit["countryId"]),
            )
        )
    return rows


def match_race(races: list[CircuitInfo], season: int, day: date) -> CircuitInfo | None:
    candidates = [
        r
        for r in races
        if r.season == season and abs((r.race_date - day).days) <= MATCH_WINDOW_DAYS
    ]
    return min(candidates, key=lambda r: abs((r.race_date - day).days), default=None)


def circuit_config(event: str, info: CircuitInfo | None) -> dict[str, Any]:
    """Hand-written config (corner names, aliases) layered over F1DB facts."""
    path = CIRCUITS_DIR / f"{slugify(event)}.json"
    manual = json.loads(path.read_text()) if path.exists() else {}
    base: dict[str, Any] = {"corners": {}, "aliases": {}}
    if info:
        base |= {
            "slug": info.slug,
            "name": info.name,
            "locality": info.place,
            "country": info.country,
            "round": info.round,
        }
    return base | manual


@lru_cache(maxsize=16)
def f1db_driver_directory(season: int) -> dict[str, tuple[str, str, str]]:
    """Code -> (car number, first name, last name) for everyone who raced in `season`."""
    from .history import download, read

    zf, _ = download()
    drivers = {d["id"]: d for d in read(zf, "drivers")}
    out: dict[str, tuple[str, str, str]] = {}
    for row in read(zf, "races-race-results"):
        if int(row["year"]) != season or not (d := drivers.get(row["driverId"])):
            continue
        out.setdefault(d["abbreviation"], (row["driverNumber"], d["firstName"], d["lastName"]))
    return out
