"""Race replay: every car's progress around the lap, sampled once per second of race time.

Progress is laps + fraction of the lap (lap 12 at half distance = 11.5), so the web app can
place each car exactly on the track outline and order cars by progress for the live
leaderboard. Stored as integers (progress x 1000) to keep the file small.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

import numpy as np

from .model import Lap, SessionData, Telemetry

PROGRESS_SCALE = 1000


@dataclass(frozen=True)
class RaceResult:
    position: int
    driver: str
    laps: int
    finish: float | None  # session time the driver took the flag
    status: str  # Finished | +N Lap(s) | DNF | DNS


def race_laps(laps: list[Lap], driver: str) -> list[Lap]:
    return sorted((lap for lap in laps if lap.driver == driver), key=lambda lap: lap.lap)


def lap_end(lap: Lap) -> float | None:
    if lap.start is None or lap.time is None:
        return None
    return lap.start + lap.time


def classify_race(driver_codes: list[str], laps: list[Lap]) -> list[RaceResult]:
    """Order by laps completed, then by the time the last lap ended. Drivers who stopped more
    than two minutes before the winner finished (and are down on laps) are DNF."""
    rows = []
    for code in driver_codes:
        timed = [lap for lap in race_laps(laps, code) if lap_end(lap) is not None]
        completed = max((lap.lap for lap in timed), default=0)
        finish = max((lap_end(lap) for lap in timed), default=None)  # type: ignore[type-var]
        rows.append((code, completed, finish))

    total = max(completed for _, completed, _ in rows)
    winner_finish = min(f for _, c, f in rows if c == total and f is not None)
    rows.sort(key=lambda r: (-r[1], r[2] if r[2] is not None else math.inf))

    results = []
    for i, (code, completed, finish) in enumerate(rows):
        if completed == 0:
            status = "DNS"
        elif completed == total:
            status = "Finished"
        elif finish is not None and finish < winner_finish - 120:
            status = "DNF"
        else:
            down = total - completed
            status = f"+{down} Lap{'s' if down > 1 else ''}"
        results.append(RaceResult(i + 1, code, completed, finish, status))
    return results


MAX_GRID_GAP = 0.1  # of a lap: the furthest a grid slot can sit behind the start line


def _lap_one_fraction(tel: Telemetry, lap_length: float) -> np.ndarray | None:
    """Lap 1 starts at each car's grid slot, so its own rel_distance puts every car level at
    the start. Measure from the start line instead: the part of lap 1 longer than a normal lap
    is the grid slot's distance behind the line, which gives a small negative start."""
    distance = np.asarray(tel.distance, dtype=float)
    if not np.isfinite(distance).any():
        return None
    behind = float(np.clip(np.nanmax(distance) - lap_length, 0, MAX_GRID_GAP * lap_length))
    return np.clip((distance - behind) / lap_length, -MAX_GRID_GAP, 1)


def reference_lap_length(telemetry: dict[tuple[str, int], Telemetry]) -> float | None:
    """Median distance of a racing lap (lap 1 excluded: it starts on the grid)."""
    lengths = [
        float(np.nanmax(d))
        for (_, lap_no), tel in telemetry.items()
        if lap_no > 1 and np.isfinite(d := np.asarray(tel.distance, dtype=float)).any()
    ]
    return float(np.median(lengths)) if lengths else None


def progress_series(
    driver_laps: list[Lap],
    telemetry: dict[int, Telemetry],
    lap_length: float | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """(session_time, progress) samples for one driver, monotonic in both. With `lap_length`,
    lap 1 is measured from the start line (grid slots behind it are slightly negative)."""
    times: list[float] = []
    progress: list[float] = []
    for lap in driver_laps:
        if lap.start is None:
            continue
        tel = telemetry.get(lap.lap)
        if tel is not None:
            t = np.asarray(tel.time, dtype=float)
            first = _lap_one_fraction(tel, lap_length) if lap.lap == 1 and lap_length else None
            rel = (
                first
                if first is not None
                else np.clip(np.asarray(tel.rel_distance, dtype=float), 0, 1)
            )
            ok = np.isfinite(t) & np.isfinite(rel)
            times.extend((lap.start + t[ok]).tolist())
            progress.extend((lap.lap - 1 + rel[ok]).tolist())
        else:
            times.append(lap.start)
            progress.append(lap.lap - 1)
        end = lap_end(lap)
        if end is not None:
            times.append(end)
            progress.append(float(lap.lap))
    if not times:
        return np.array([]), np.array([])
    order = np.lexsort((progress, times))  # by time, then progress
    t = np.asarray(times)[order]
    p = np.maximum.accumulate(np.asarray(progress)[order])
    keep = np.concatenate((np.diff(t) > 1e-6, [True]))  # last sample of equal times wins
    return t[keep], p[keep]


def sample(t: np.ndarray, p: np.ndarray, grid: np.ndarray) -> list[int]:
    """Progress on the grid; holds the last value after the car stops."""
    if len(t) == 0:
        return [0] * len(grid)
    values = np.interp(grid, t, p, left=0.0, right=float(p[-1]))
    return [int(v) for v in np.rint(values * PROGRESS_SCALE)]


STATUS_PATTERNS = [
    (re.compile(r"\bRED FLAG\b"), "red", "start"),
    (re.compile(r"^SAFETY CAR DEPLOYED"), "sc", "start"),
    (re.compile(r"^SAFETY CAR IN THIS LAP"), "sc", "end"),
    (re.compile(r"^VIRTUAL SAFETY CAR DEPLOYED"), "vsc", "start"),
    (re.compile(r"^VIRTUAL SAFETY CAR ENDING"), "vsc", "end"),
    (re.compile(r"^(TRACK CLEAR|GREEN LIGHT)"), "*", "end"),
]

# A suspension ends when the cars leave the pit lane again, not when marshals clear the
# track: "TRACK CLEAR" during a red flag only means the barriers are fixed.
RED_ENDS = re.compile(
    r"^(SAFETY CAR LIGHTS ON|SAFETY CAR WILL ENTER|GREEN LIGHT|STANDING START|ROLLING START"
    r"|CHEQUERED FLAG|ALL CARS MAY OVERTAKE|DRS ENABLED)"
)


def track_status(messages: list[dict[str, Any]], race_end: float) -> list[dict[str, Any]]:
    """Safety car, virtual safety car and red flag periods from race control messages.
    A red flag outranks an open safety car: it closes it and starts its own period."""
    periods: list[dict[str, Any]] = []
    open_period: dict[str, Any] | None = None

    def close(t: float) -> None:
        nonlocal open_period
        if open_period:
            periods.append({**open_period, "to": t})
            open_period = None

    for m in sorted(messages, key=lambda x: x["t"]):
        text, t = m["message"], m["t"]
        if text.startswith("CHEQUERED FLAG"):
            close(t)
            break  # anything after the flag is post-race housekeeping
        if open_period and open_period["status"] == "red":
            if RED_ENDS.search(text):
                close(t)
            continue
        for pattern, kind, edge in STATUS_PATTERNS:
            if not pattern.search(text):
                continue
            if kind == "red":
                close(t)
                open_period = {"status": "red", "from": t}
            elif edge == "start" and open_period is None:
                open_period = {"status": kind, "from": t}
            elif edge == "end" and open_period and kind in ("*", open_period["status"]):
                close(t)
            break
    close(race_end)
    return periods


def build_replay(
    data: SessionData,
    results: list[RaceResult],
    telemetry: dict[tuple[str, int], Telemetry],
    step: float = 1.0,
) -> dict[str, Any]:
    starts = [lap.start for lap in data.laps if lap.lap == 1 and lap.start is not None]
    t0 = min(starts)
    finishes = [r.finish for r in results if r.finish is not None]
    t_end = max(finishes) + 5
    grid = np.arange(t0, t_end, step)

    def rel(t: float | None) -> float | None:
        return None if t is None else round(t - t0, 1)

    lap_length = reference_lap_length(telemetry)
    progress: dict[str, list[int]] = {}
    stints: dict[str, list[dict[str, Any]]] = {}
    pits: list[dict[str, Any]] = []
    for r in results:
        dl = race_laps(data.laps, r.driver)
        tel = {lap_no: tel for (code, lap_no), tel in telemetry.items() if code == r.driver}
        t, p = progress_series(dl, tel, lap_length)
        progress[r.driver] = sample(t, p, grid)

        driver_stints: list[dict[str, Any]] = []
        for lap in dl:
            if lap.compound is None:
                continue
            last = driver_stints[-1] if driver_stints else None
            if last and last["stint"] == lap.stint and last["compound"] == lap.compound:
                last["to"] = lap.lap
            else:
                driver_stints.append(
                    {
                        "stint": lap.stint,
                        "compound": lap.compound,
                        "from": lap.lap,
                        "to": lap.lap,
                        "age": (lap.tyre_life or 1) - 1,
                    }
                )
        stints[r.driver] = driver_stints

        for lap in dl:
            if lap.pit_in is None:
                continue
            nxt = next((x for x in dl if x.lap == lap.lap + 1), None)
            out = nxt.pit_out if nxt else None
            pits.append(
                {
                    "driver": r.driver,
                    "lap": lap.lap,
                    "in": rel(lap.pit_in),
                    "out": rel(out),
                    "duration": round(out - lap.pit_in, 1) if out is not None else None,
                }
            )

    messages = []
    if data.utc_offset is not None:
        for m in data.race_control:
            t = m["utc"] - data.utc_offset - t0
            if -60 <= t <= t_end - t0:
                messages.append(
                    {
                        "t": round(t, 1),
                        "lap": m["lap"],
                        "category": m["category"],
                        "flag": m["flag"],
                        "message": m["message"],
                    }
                )

    lap_starts = {
        r.driver: [rel(lap.start) for lap in race_laps(data.laps, r.driver)] for r in results
    }
    total_laps = max(r.laps for r in results)
    return {
        "schemaVersion": 1,
        "step": step,
        "duration": round(float(grid[-1] - t0), 1),
        "totalLaps": total_laps,
        "scale": PROGRESS_SCALE,
        "progress": progress,
        "lapStarts": lap_starts,
        "stints": stints,
        "pits": sorted(pits, key=lambda x: x["in"] or 0),
        "trackStatus": track_status(messages, round(float(t_end - t0), 1)),
        "messages": messages,
        "classification": [
            {
                "position": r.position,
                "driver": r.driver,
                "laps": r.laps,
                "status": r.status,
                "time": rel(r.finish),
            }
            for r in results
        ],
    }
