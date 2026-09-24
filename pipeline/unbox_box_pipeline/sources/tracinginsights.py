"""TracingInsights season archives (https://github.com/TracingInsights): MIT for 2023 and
2024, Apache-2.0 from 2025 (each season is its own repository with its own licence).

Files are FastF1-derived JSON, one folder per event/session/driver. We fetch only the files
we need over raw.githubusercontent.com and cache them."""

from __future__ import annotations

import statistics
import urllib.parse
from collections.abc import Callable
from datetime import datetime, timezone
from functools import cache
from typing import Any

from ..http import exists, get_json
from ..model import Corner, Driver, Lap, SessionData, Telemetry
from ..sessions import canonical_session, is_event_folder, upstream_names

# Each season's repository carries its own licence (checked on GitHub, 2026-09-24).
SEASON_LICENSES = {2023: "MIT", 2024: "MIT"}
DEFAULT_LICENSE = "Apache-2.0"


def season_license(season: int) -> str:
    return SEASON_LICENSES.get(season, DEFAULT_LICENSE)


RAW = "https://raw.githubusercontent.com/TracingInsights/{season}/main/{path}"
CONTENTS = "https://api.github.com/repos/TracingInsights/{season}/contents/"


def _num(value: Any) -> float | None:
    if value is None or value == "None" or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int(value: Any) -> int | None:
    number = _num(value)
    return int(number) if number is not None else None


def _utc(text: str) -> float:
    """'2025-09-07T13:03:34.806000000' -> epoch seconds (nanoseconds trimmed)."""
    head, _, frac = text.partition(".")
    stamp = datetime.fromisoformat(head).replace(tzinfo=timezone.utc).timestamp()
    return stamp + (float(f"0.{frac}") if frac else 0.0)


def _col(values: list[Any]) -> list[float]:
    return [v if (v := _num(x)) is not None else float("nan") for x in values]


def _url(season: int, *parts: str) -> str:
    path = "/".join(urllib.parse.quote(p) for p in parts)
    return RAW.format(season=season, path=path)


@cache
def _folder(season: int, event: str, session: str) -> str | None:
    """The upstream folder for a canonical session name, or None if it isn't published."""
    for name in upstream_names(session):
        if exists(_url(season, event, name, "drivers.json")):
            return name
    return None


# code -> (car number, first name, last name); fills gaps in upstream drivers.json.
DriverDirectory = dict[str, tuple[str, str, str]]


def parse_driver(raw: dict[str, Any], directory: DriverDirectory) -> Driver:
    """Some 2023 files carry only the code and team; names and numbers come from F1DB."""
    code = raw["driver"]
    number, first, last = directory.get(code, ("", "", code))
    return Driver(
        code=code,
        number=str(raw["dn"]) if raw.get("dn") not in (None, "") else number,
        first_name=raw.get("fn") or first,
        last_name=raw.get("ln") or last,
        team=raw.get("team") or "",
    )


class TracingInsightsSource:
    name = "TracingInsights"

    def __init__(self, directory: Callable[[int], DriverDirectory] | None = None) -> None:
        self._directory = directory or (lambda _season: {})

    def session_prefix(self, season: int, event: str, session: str) -> str:
        """URL prefix of every file for one session (used to prune the cache)."""
        folder = _folder(season, event, session) or canonical_session(session)
        return _url(season, event, folder) + "/"

    def list_events(self, season: int) -> list[str]:
        # Uncached: new events appear during the season.
        listing = get_json(CONTENTS.format(season=season), cache=False)
        return sorted(
            e["name"] for e in listing if e["type"] == "dir" and is_event_folder(e["name"])
        )

    def has_session(self, season: int, event: str, session: str) -> bool:
        return _folder(season, event, session) is not None

    def _file(self, season: int, event: str, session: str, *parts: str) -> Any:
        folder = _folder(season, event, session)
        if folder is None:
            raise FileNotFoundError(f"{season} {event} {session} is not published upstream")
        return get_json(_url(season, event, folder, *parts))

    def load_session(self, season: int, event: str, session: str) -> SessionData:
        drivers_raw = self._file(season, event, session, "drivers.json")["drivers"]
        directory = self._directory(season)
        drivers = [parse_driver(d, directory) for d in drivers_raw]

        laps: list[Lap] = []
        air: list[float] = []
        track: list[float] = []
        offsets: list[float] = []
        for driver in drivers:
            try:
                raw = self._file(season, event, session, driver.code, "laptimes.json")
            except FileNotFoundError:
                continue  # entered but never set a lap
            count = len(raw["lap"])
            for i in range(count):
                laps.append(
                    Lap(
                        driver=driver.code,
                        lap=int(raw["lap"][i]),
                        time=_num(raw["time"][i]),
                        s1=_num(raw["s1"][i]),
                        s2=_num(raw["s2"][i]),
                        s3=_num(raw["s3"][i]),
                        compound=raw["compound"][i] if raw["compound"][i] != "None" else None,
                        segment=raw.get("qs", [None] * count)[i],
                        deleted=bool(raw["del"][i]),
                        speed_trap=_num(raw["vst"][i]),
                        start=_num(raw["lST"][i]),
                        pit_in=_num(raw["pin"][i]),
                        pit_out=_num(raw["pout"][i]),
                        position=_int(raw["pos"][i]),
                        stint=_int(raw["stint"][i]),
                        tyre_life=_int(raw["life"][i]),
                    )
                )
                start = _num(raw["lST"][i])
                if start is not None and raw["lSD"][i] not in (None, "None", "NaT"):
                    offsets.append(_utc(raw["lSD"][i]) - start)
                if (a := _num(raw["wAT"][i])) is not None:
                    air.append(a)
                if (t := _num(raw["wTT"][i])) is not None:
                    track.append(t)

        corners_raw = self._file(season, event, session, "corners.json")
        corners = [
            Corner(number=int(n), distance=float(d), x=float(x), y=float(y))
            for n, d, x, y in zip(
                corners_raw["CornerNumber"],
                corners_raw["Distance"],
                corners_raw["X"],
                corners_raw["Y"],
                strict=True,
            )
        ]

        rcm = self._file(season, event, session, "rcm.json")
        date = rcm["time"][0][:10] if rcm.get("time") else None
        race_control = [
            {
                "utc": _utc(rcm["time"][i]),
                "category": rcm["cat"][i],
                "message": rcm["msg"][i],
                "flag": None if rcm["flag"][i] == "None" else rcm["flag"][i],
                "lap": _int(rcm["lap"][i]),
            }
            for i in range(len(rcm.get("time", [])))
        ]

        return SessionData(
            season=season,
            event=event,
            session=canonical_session(session),
            date=date,
            drivers=drivers,
            laps=laps,
            corners=corners,
            rotation=float(corners_raw.get("Rotation", 0.0)),
            air_temp=round(statistics.fmean(air), 1) if air else None,
            track_temp=round(statistics.fmean(track), 1) if track else None,
            source_name="TracingInsights",
            source_url=f"https://github.com/TracingInsights/{season}",
            source_license=season_license(season),
            utc_offset=statistics.median(offsets) if offsets else None,
            race_control=race_control,
        )

    def load_telemetry(self, season: int, event: str, session: str, lap: Lap) -> Telemetry:
        raw = self._file(season, event, session, lap.driver, f"{lap.lap}_tel.json")["tel"]
        return Telemetry(
            driver=lap.driver,
            lap=lap.lap,
            time=_col(raw["time"]),
            distance=_col(raw["distance"]),
            rel_distance=_col(raw["rel_distance"]),
            speed=_col(raw["speed"]),
            throttle=_col(raw["throttle"]),
            brake=_col(raw["brake"]),
            gear=_col(raw["gear"]),
            rpm=_col(raw["rpm"]),
            drs=_col(raw["drs"]),
            x=_col(raw["x"]),
            y=_col(raw["y"]),
            z=_col(raw["z"]),
        )
