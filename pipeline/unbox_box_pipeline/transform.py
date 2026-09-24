"""Pure functions: classify laps and resample telemetry onto a shared distance grid.
No I/O here, so everything is unit-testable.

How lap-vs-lap deltas stay trustworthy:
1. Time from speed: elapsed time at each point is the integral of dx / v over the distance
   grid. It is smooth and physically consistent with the speed trace (the raw time channel
   mixes two feeds sampled at different rates and jitters by tenths).
2. Corner alignment: integrated distance drifts by tens of metres between laps, which shows
   up as fake spikes in braking zones. Each lap's slowest point in every real corner is
   pinned to the reference (pole) lap's slowest point, and distance is warped linearly
   in between.
3. Official timing anchors: each lap's time is rescaled piecewise so it hits that lap's
   official sector splits and lap time exactly. Drift can't accumulate past a sector line.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass

import numpy as np

from .model import Lap, Telemetry

SEGMENT_ORDER = ("Q3", "Q2", "Q1")


def is_valid(lap: Lap) -> bool:
    return lap.time is not None and not lap.deleted and not math.isnan(lap.time)


@dataclass(frozen=True)
class Classified:
    position: int
    driver: str
    best: Lap | None
    reached: str | None  # last qualifying segment the driver set a valid time in


def best_lap(laps: list[Lap]) -> Lap | None:
    valid = [lap for lap in laps if is_valid(lap)]
    return min(valid, key=lambda lap: lap.time or math.inf) if valid else None


def classify(driver_codes: list[str], laps: list[Lap]) -> list[Classified]:
    """Qualifying order: Q3 runners by Q3 time, then Q2 by Q2 time, then Q1 by Q1 time.
    Sessions without segments (practice) are ordered by best lap."""
    by_driver = {code: [lap for lap in laps if lap.driver == code] for code in driver_codes}
    has_segments = any(lap.segment in SEGMENT_ORDER for lap in laps)

    ranked: list[tuple[int, float, str, Lap | None, str | None]] = []
    for code, driver_laps in by_driver.items():
        if has_segments:
            for tier, segment in enumerate(SEGMENT_ORDER):
                seg_best = best_lap([lap for lap in driver_laps if lap.segment == segment])
                if seg_best is not None:
                    ranked.append((tier, seg_best.time or math.inf, code, seg_best, segment))
                    break
            else:
                ranked.append((len(SEGMENT_ORDER), math.inf, code, None, None))
        else:
            overall = best_lap(driver_laps)
            ranked.append((0, overall.time if overall else math.inf, code, overall, None))

    ranked.sort(key=lambda r: (r[0], r[1]))
    return [
        Classified(position=i + 1, driver=code, best=lap, reached=segment)
        for i, (_, _, code, lap, segment) in enumerate(ranked)
    ]


def laps_worth_telemetry(driver_laps: list[Lap]) -> list[Lap]:
    """The best valid lap in each segment (or overall when there are no segments)."""
    segments = {lap.segment for lap in driver_laps if lap.segment}
    picks = [best_lap([lap for lap in driver_laps if lap.segment == s]) for s in sorted(segments)]
    if not segments:
        picks = [best_lap(driver_laps)]
    unique = {lap.lap: lap for lap in picks if lap is not None}
    return sorted(unique.values(), key=lambda lap: lap.lap)


def reference_length(telemetry: list[Telemetry]) -> float:
    lengths = [np.nanmax(np.asarray(t.distance)) for t in telemetry]
    return float(statistics.median(lengths))


# --- Resampling ----------------------------------------------------------------------------


def _monotonic(pos: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Monotonic, duplicate-free positions plus the sample indices kept."""
    finite = np.isfinite(pos)
    idx = np.nonzero(finite)[0]
    mono = np.maximum.accumulate(pos[finite])
    keep = np.concatenate(([True], np.diff(mono) > 1e-6))
    return mono[keep], idx[keep]


def _interp(grid: np.ndarray, pos: np.ndarray, values: np.ndarray) -> np.ndarray:
    finite = np.isfinite(values)
    if finite.sum() < 2:
        return np.full_like(grid, np.nan)
    return np.interp(grid, pos[finite], values[finite])


def _step(grid: np.ndarray, pos: np.ndarray, values: np.ndarray) -> np.ndarray:
    """Previous-sample hold for categorical channels (gear, brake, DRS)."""
    i = np.clip(np.searchsorted(pos, grid, side="right") - 1, 0, len(pos) - 1)
    return values[i]


def anchor_times(
    grid: np.ndarray, t: np.ndarray, marks: list[float], targets: list[float]
) -> np.ndarray:
    """Piecewise-linear rescale so t(marks[k]) == targets[k]. `marks` run from 0 to the lap
    length; the finish time is extrapolated from the last grid point."""
    finish = t[-1] + (marks[-1] - grid[-1]) * (t[-1] - t[-2]) / (grid[-1] - grid[-2])
    at_marks = np.interp(marks, grid, t)
    at_marks[0], at_marks[-1] = t[0], finish
    return np.interp(t, at_marks, targets)


def corner_apexes(
    pos: np.ndarray, speed: np.ndarray, corners: list[float], window: float = 150.0
) -> list[float | None]:
    """Distance of the slowest point near each corner, or None for flat-out corners."""
    out: list[float | None] = []
    for c in corners:
        mask = (pos >= c - window) & (pos <= c + window) & np.isfinite(speed)
        if mask.sum() < 3:
            out.append(None)
            continue
        seg_speed = speed[mask]
        if seg_speed.min() > 0.85 * seg_speed.max():  # no real braking: not an anchor
            out.append(None)
            continue
        out.append(float(pos[mask][int(np.argmin(seg_speed))]))
    return out


def warp_to_reference(
    pos: np.ndarray, own: list[float | None], ref: list[float | None], length: float
) -> np.ndarray:
    """Piecewise-linear distance warp that moves each own apex onto the reference apex."""
    src, dst = [0.0], [0.0]
    for a, b in zip(own, ref, strict=True):
        if a is None or b is None or a <= src[-1] + 20 or b <= dst[-1] + 20:
            continue
        src.append(a)
        dst.append(b)
    src.append(length)
    dst.append(length)
    return np.interp(pos, src, dst)


def resample(
    tel: Telemetry,
    length: float,
    step: float,
    lap_time: float | None = None,
    sector_marks: list[float] | None = None,
    sector_times: list[float | None] | None = None,
    ref_apexes: list[float | None] | None = None,
    corners: list[float] | None = None,
) -> dict[str, list[float] | list[int]]:
    """Resample one lap onto a fixed distance grid.

    - With `lap_time`, the time channel finishes exactly on the official lap time.
    - With `sector_marks` + `sector_times`, times also hit each official sector split.
    - With `ref_apexes` + `corners`, braking zones are aligned to the reference lap.
    """
    grid = np.arange(0.0, length, step)
    pos, idx = _monotonic(np.asarray(tel.rel_distance, dtype=float) * length)
    if ref_apexes is not None and corners is not None:
        raw_speed = np.asarray(tel.speed, dtype=float)[idx]
        pos = warp_to_reference(pos, corner_apexes(pos, raw_speed, corners), ref_apexes, length)

    def ch(values: list[float]) -> np.ndarray:
        return np.asarray(values, dtype=float)[idx]

    def ints(a: np.ndarray) -> list[int]:
        return [int(v) for v in np.nan_to_num(np.rint(a))]

    speed = _interp(grid, pos, ch(tel.speed))
    seconds_per_step = step / np.maximum(speed / 3.6, 1.0)
    t = np.concatenate(([0.0], np.cumsum(seconds_per_step)[:-1]))

    if lap_time and np.all(np.isfinite(t)):
        marks = [0.0, length]
        targets = [0.0, lap_time]
        if sector_marks and sector_times and all(s is not None for s in sector_times[:2]):
            s1, s2 = float(sector_times[0]), float(sector_times[1])  # type: ignore[arg-type]
            marks = [0.0, sector_marks[0], sector_marks[1], length]
            targets = [0.0, s1, s1 + s2, lap_time]
        t = anchor_times(grid, t, marks, targets)

    return {
        "t": [round(float(v), 3) for v in t],
        "speed": ints(speed),
        "throttle": ints(np.clip(_interp(grid, pos, ch(tel.throttle)), 0, 100)),
        "brake": ints(_step(grid, pos, ch(tel.brake)) > 0),
        "gear": ints(_step(grid, pos, np.nan_to_num(ch(tel.gear)))),
        "rpm": ints(_interp(grid, pos, ch(tel.rpm))),
        "drs": ints(_step(grid, pos, np.nan_to_num(ch(tel.drs))) > 0),
        "x": ints(_interp(grid, pos, ch(tel.x))),
        "y": ints(_interp(grid, pos, ch(tel.y))),
        "z": ints(_interp(grid, pos, ch(tel.z))),
    }


def sector_marks_from(t: list[float], step: float, s1: float, s2: float) -> list[float]:
    """Distances where a lap's elapsed time crosses its own sector splits."""
    times = np.asarray(t)
    grid = np.arange(len(times)) * step
    return [float(np.interp(s1, times, grid)), float(np.interp(s1 + s2, times, grid))]
