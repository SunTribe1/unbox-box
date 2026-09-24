"""Orchestrates one session build: source -> classify -> resample -> write."""

from __future__ import annotations

import math
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path
from typing import Any

import numpy as np

from .circuits import CircuitInfo, circuit_config, match_race
from .model import Lap, Telemetry
from .outline import best_outline
from .replay import build_replay, classify_race
from .sources.base import SessionSource
from .transform import (
    Classified,
    _monotonic,
    best_lap,
    classify,
    corner_apexes,
    laps_worth_telemetry,
    reference_length,
    resample,
    sector_marks_from,
)
from .writer import SCHEMA_VERSION, dump, session_id, slugify, update_index

FETCH_WORKERS = 8  # parallel telemetry downloads; each worker still pauses between requests

MIN_SAMPLES = 50  # fewer finite points than this is a broken upstream file, not a lap


def usable(tel: Telemetry) -> bool:
    rel = np.asarray(tel.rel_distance, dtype=float)
    speed = np.asarray(tel.speed, dtype=float)
    return (
        int(np.isfinite(rel).sum()) >= MIN_SAMPLES and int(np.isfinite(speed).sum()) >= MIN_SAMPLES
    )


def fetch_telemetry(
    source: SessionSource, season: int, event: str, session: str, laps: list[Lap]
) -> dict[tuple[str, int], Telemetry]:
    """Downloads telemetry for many laps in parallel. Laps missing upstream are skipped."""

    def one(lap: Lap) -> tuple[tuple[str, int], Telemetry | None]:
        try:
            tel = source.load_telemetry(season, event, session, lap)
        except (FileNotFoundError, RuntimeError):
            return (lap.driver, lap.lap), None
        return (lap.driver, lap.lap), tel if usable(tel) else None

    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        return {key: tel for key, tel in pool.map(one, laps) if tel is not None}


def _lap_json(lap: Lap, has_tel: bool) -> dict[str, Any]:
    return {
        "lap": lap.lap,
        "time": lap.time,
        "s1": lap.s1,
        "s2": lap.s2,
        "s3": lap.s3,
        "segment": lap.segment,
        "compound": lap.compound,
        "deleted": lap.deleted,
        "speedTrap": lap.speed_trap,
        "telemetry": has_tel,
    }


def build_session(
    source: SessionSource,
    season: int,
    event: str,
    session: str,
    out_dir: Path,
    step: float = 5.0,
    races: list[CircuitInfo] | None = None,
) -> dict[str, Any]:
    data = source.load_session(season, event, session)
    session = data.session  # canonical name, e.g. Sprint Shootout -> Sprint Qualifying
    sid = session_id(season, event, session)
    session_dir = out_dir / "sessions" / sid
    info = match_race(races, season, date.fromisoformat(data.date)) if races and data.date else None
    circuit = circuit_config(event, info)

    # 1. Which laps get telemetry: each driver's best lap per qualifying segment.
    picks: list[Lap] = []
    for driver in data.drivers:
        picks += laps_worth_telemetry([lap for lap in data.laps if lap.driver == driver.code])
    raw = fetch_telemetry(source, season, event, session, picks)
    picks = [lap for lap in picks if (lap.driver, lap.lap) in raw]

    # 2. Classification. Qualifying/practice: by best lap. Race: by laps and finish time.
    codes = [d.code for d in data.drivers]
    is_race = session.lower() in ("race", "sprint")
    race_results = classify_race(codes, data.laps) if is_race else []
    if is_race:
        results = [
            Classified(
                r.position, r.driver, best_lap([x for x in data.laps if x.driver == r.driver]), None
            )
            for r in race_results
        ]
    else:
        results = classify(codes, data.laps)
    # The reference lap for alignment is the fastest lap of the session.
    timed = [
        r.best
        for r in results
        if r.best is not None and r.best.time is not None and (r.best.driver, r.best.lap) in raw
    ]
    assert timed, "session has no valid laps"
    pole = min(timed, key=lambda lap: lap.time or math.inf)

    # 3. One shared distance grid; time from speed, anchored to official sector splits.
    length = reference_length(list(raw.values()))
    pole_raw = raw[(pole.driver, pole.lap)]
    corner_distances = [c.distance for c in data.corners]
    pole_pos, pole_idx = _monotonic(np.asarray(pole_raw.rel_distance, dtype=float) * length)
    ref_apexes = corner_apexes(
        pole_pos, np.asarray(pole_raw.speed, dtype=float)[pole_idx], corner_distances
    )
    pole_first = resample(pole_raw, length, step, pole.time)
    marks = (
        sector_marks_from(pole_first["t"], step, pole.s1, pole.s2)  # type: ignore[arg-type]
        if pole.s1 and pole.s2
        else None
    )
    sizes = 0
    by_key = {(lap.driver, lap.lap): lap for lap in picks}
    pole_tel = pole_first
    traces: list[tuple[list[float], list[float]]] = []
    for (code, lap_no), tel in raw.items():
        lap = by_key[(code, lap_no)]
        channels = resample(
            tel,
            length,
            step,
            lap.time,
            marks,
            [lap.s1, lap.s2, lap.s3],
            ref_apexes,
            corner_distances,
        )
        if (code, lap_no) == (pole.driver, pole.lap):
            pole_tel = channels
        traces.append((channels["x"], channels["y"]))  # type: ignore[arg-type]
        sizes += dump(
            session_dir / "tel" / f"{code}-{lap_no}.json",
            {"driver": code, "lap": lap_no, **channels},
        )

    # 4. Track outline: the lap with the cleanest position trace (see outline.py), falling
    #    back to the reference lap. Every lap shares the distance grid, so cars still line up.
    shape = best_outline(traces) or (pole_tel["x"], pole_tel["y"])
    outline_x = shape[0][::2]
    outline_y = shape[1][::2]

    names = circuit.get("corners", {})
    corners = [
        {
            "number": c.number,
            "name": names.get(str(c.number)),
            "distance": round(float(np.clip(c.distance, 0, length)), 1),
            "x": round(c.x),
            "y": round(c.y),
        }
        for c in data.corners
    ]

    tel_keys = set(raw)
    winner_finish = race_results[0].finish if race_results else None
    race_fields = {
        r.driver: {
            "status": r.status,
            "lapsCompleted": r.laps,
            "raceTime": round(r.finish - winner_finish, 3)
            if r.finish is not None and winner_finish is not None and r.status == "Finished"
            else None,
        }
        for r in race_results
    }
    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "id": sid,
        "season": season,
        "round": circuit.get("round"),
        "event": event,
        "session": session,
        "date": data.date,
        "circuit": {
            "slug": circuit.get("slug", slugify(event)),
            "name": circuit.get("name", event),
            "locality": circuit.get("locality"),
            "country": circuit.get("country"),
            "length": round(length, 1),
            "rotation": data.rotation,
            "corners": corners,
            "aliases": circuit.get("aliases", {}),
        },
        "weather": {"airTemp": data.air_temp, "trackTemp": data.track_temp},
        "drivers": [
            {
                "code": d.code,
                "number": d.number,
                "firstName": d.first_name,
                "lastName": d.last_name,
                "team": d.team,
            }
            for d in data.drivers
        ],
        "results": [
            {
                "position": r.position,
                "driver": r.driver,
                "lap": r.best.lap if r.best else None,
                "time": r.best.time if r.best else None,
                "segment": r.reached,
                "s1": r.best.s1 if r.best else None,
                "s2": r.best.s2 if r.best else None,
                "s3": r.best.s3 if r.best else None,
                "compound": r.best.compound if r.best else None,
                "speedTrap": r.best.speed_trap if r.best else None,
                **race_fields.get(r.driver, {}),
            }
            for r in results
        ],
        "laps": {
            d.code: [
                _lap_json(lap, (lap.driver, lap.lap) in tel_keys)
                for lap in data.laps
                if lap.driver == d.code
            ]
            for d in data.drivers
        },
        "telemetry": {
            "step": step,
            "length": round(length, 1),
            "points": len(pole_tel["t"]),
            "sectorMarks": [round(m, 1) for m in marks] if marks else None,
        },
        "track": {"x": outline_x, "y": outline_y},
        "attribution": [
            {"name": data.source_name, "url": data.source_url, "license": data.source_license}
        ],
    }
    meta["replay"] = is_race
    sizes += dump(session_dir / "meta.json", meta)

    # 5. Race replay: every lap of every car.
    if is_race:
        # A missing lap is interpolated from lap start times.
        timed_laps = [lap for lap in data.laps if lap.start is not None]
        all_tel = fetch_telemetry(source, season, event, session, timed_laps)
        sizes += dump(session_dir / "replay.json", build_replay(data, race_results, all_tel))

    update_index(
        out_dir,
        {
            "id": sid,
            "season": season,
            "round": circuit.get("round"),
            "event": event,
            "session": session,
            "date": data.date,
            "circuit": meta["circuit"]["name"],
            "circuitId": meta["circuit"]["slug"],
            "country": circuit.get("country"),
        },
    )
    return {
        "id": sid,
        "laps_with_telemetry": len(raw),
        "bytes": sizes,
        "length_m": round(length, 1),
    }
