"""Track outline: the circuit shape drawn on every map.

Every lap with telemetry is resampled onto the same aligned distance grid, so any of them
can supply the outline without moving the cars. Position data quality varies by lap: some
laps carry only a handful of GPS fixes (the resampled line is then a polygon of straight
chords), some have none at all (all zeros), and a few have single-point glitches. We score
each candidate and keep the smoothest usable one.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from .writer import dump

Outline = tuple[list[float], list[float]]

MIN_EXTENT_M = 100.0  # smaller than any circuit: the lap has no real position data
MIN_DISTINCT = 0.5  # share of distinct points a real trace has at least
ROUGH_FACTOR = 3.0  # this many times the circuit's median roughness means sparse GPS
MIN_PEERS = 3  # sessions at a circuit needed before we judge one against the others
SPIKE_WINDOW = 3  # longest glitch (in points) the filter removes
SPIKE_SPACINGS = 6.0  # a point this many median spacings off its neighbourhood is a glitch


def _turns(x: list[float], y: list[float]) -> list[float]:
    """Turning angle (radians) at each vertex of the closed loop, skipping repeated points."""
    pts = [
        (a, b)
        for i, (a, b) in enumerate(zip(x, y, strict=True))
        if i == 0 or (a, b) != (x[i - 1], y[i - 1])
    ]
    n = len(pts)
    out = []
    for i in range(n):
        (ax, ay), (bx, by), (cx, cy) = pts[i - 1], pts[i], pts[(i + 1) % n]
        if (ax, ay) == (bx, by) or (bx, by) == (cx, cy):
            continue
        a1 = math.atan2(by - ay, bx - ax)
        a2 = math.atan2(cy - by, cx - bx)
        out.append(abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi))
    return out


def roughness(x: list[float], y: list[float]) -> float:
    """Sum of squared turning angles. A smooth curve spreads its turning over many small
    angles; a polygon concentrates it at a few corners, which squares to a far larger sum.
    Infinite when the lap has no usable positions."""
    if not x or len(x) != len(y):
        return math.inf
    extent = max(max(x) - min(x), max(y) - min(y))
    distinct = len(set(zip(x, y, strict=True))) / len(x)
    if extent < MIN_EXTENT_M or distinct < MIN_DISTINCT:
        return math.inf
    return sum(t * t for t in _turns(x, y))


def despike(x: list[float], y: list[float]) -> Outline:
    """Removes GPS glitches: points far from the median of their neighbourhood (a Hampel
    filter on the closed loop). The median ignores a glitch of up to SPIKE_WINDOW points,
    and the threshold scales with the trace's own point spacing, so it works in any units.
    Glitched points are re-drawn by interpolating between the nearest good neighbours."""
    n = len(x)
    if n < 2 * SPIKE_WINDOW + 1:
        return list(x), list(y)
    seg = sorted(
        d for i in range(n) if (d := math.hypot(x[(i + 1) % n] - x[i], y[(i + 1) % n] - y[i])) > 0
    )
    if not seg:
        return list(x), list(y)
    limit = SPIKE_SPACINGS * seg[len(seg) // 2]
    w = SPIKE_WINDOW + 1  # window radius: one wider than the longest glitch we remove

    def median(values: list[float]) -> float:
        v = sorted(values)
        return v[len(v) // 2]

    bad = set()
    for i in range(n):
        idx = [(i + k) % n for k in range(-w, w + 1)]
        mx, my = median([x[j] for j in idx]), median([y[j] for j in idx])
        if math.hypot(x[i] - mx, y[i] - my) > limit:
            bad.add(i)
    if not bad or len(bad) > n // 4:  # nothing to fix, or the whole trace is noise
        return list(x), list(y)

    xs, ys = list(x), list(y)
    for i in bad:
        p = next(((i - k) % n for k in range(1, n) if (i - k) % n not in bad), i)
        q = next(((i + k) % n for k in range(1, n) if (i + k) % n not in bad), i)
        span = (q - p) % n or 1
        f = ((i - p) % n) / span
        xs[i] = x[p] + (x[q] - x[p]) * f
        ys[i] = y[p] + (y[q] - y[p]) * f
    return xs, ys


def best_outline(candidates: list[Outline]) -> Outline | None:
    """The smoothest candidate after removing glitches, or None if none has positions."""
    best: Outline | None = None
    score = math.inf
    for x, y in candidates:
        clean = despike(x, y)
        r = roughness(*clean)
        if r < score:
            best, score = clean, r
    return best


def score(shape: Outline) -> float:
    """Roughness scaled by point count, so sessions sampled differently compare fairly."""
    return roughness(*shape) * len(shape[0])


def rebuild_outlines(out_dir: Path) -> list[str]:
    """Re-picks the outline of every built session from its stored laps (no network).

    A session borrows another session's outline at the same circuit (the same season first)
    when none of its laps has position data, or when even its best lap is far rougher than
    the circuit's usual outline: every lap then had sparse GPS and would draw a polygon.
    Returns the ids of sessions whose outline changed."""
    metas: dict[Path, dict[str, Any]] = {}
    shapes: dict[Path, Outline | None] = {}
    for meta_path in sorted(out_dir.glob("sessions/*/meta.json")):
        traces = []
        for tel_path in sorted(meta_path.parent.glob("tel/*.json")):
            tel = json.loads(tel_path.read_text(encoding="utf-8"))
            traces.append((tel["x"], tel["y"]))
        metas[meta_path] = json.loads(meta_path.read_text(encoding="utf-8"))
        shapes[meta_path] = best_outline(traces)

    scores = {path: score(shape) for path, shape in shapes.items() if shape is not None}
    by_circuit: dict[str, list[float]] = {}
    for path, value in scores.items():
        by_circuit.setdefault(metas[path]["circuit"]["slug"], []).append(value)

    def usable(path: Path) -> bool:
        if path not in scores:
            return False
        peers = sorted(by_circuit[metas[path]["circuit"]["slug"]])
        if len(peers) < MIN_PEERS:
            return True
        return scores[path] <= ROUGH_FACTOR * peers[len(peers) // 2]

    def borrowed(meta: dict[str, Any]) -> Path | None:
        """The session whose outline to use instead: same circuit, nearest season."""
        slug, season = meta["circuit"]["slug"], meta["season"]
        siblings = [
            (abs(other["season"] - season), scores[path], path)
            for path, other in metas.items()
            if other["circuit"]["slug"] == slug and usable(path)
        ]
        return min(siblings)[2] if siblings else None

    changed = []
    for meta_path, meta in metas.items():
        own = usable(meta_path)
        donor = None if own else borrowed(meta)
        shape = shapes[meta_path] if own else (shapes[donor] if donor else shapes[meta_path])
        if shape is None:
            continue
        track = {"x": shape[0][::2], "y": shape[1][::2]}
        # Record a borrowed shape so the app can tell people where the map came from.
        quality = {"outline": "borrowed", "from": metas[donor]["id"]} if donor else None
        updated = {k: v for k, v in meta.items() if k != "quality"}
        updated["track"] = track
        if quality:
            updated["quality"] = quality
        if updated != meta:
            dump(meta_path, updated)
            changed.append(meta_path.parent.name)
    return changed


SHAPE_POINTS = 150  # enough for a crisp card thumbnail, a few KB for the whole calendar


def build_circuit_shapes(out_dir: Path) -> dict[str, Any]:
    """Writes data/circuits.json: one small outline per circuit (from its most recent
    session), with rotation and named corners, for the Circuits pages."""
    latest: dict[str, dict[str, Any]] = {}
    for meta_path in sorted(out_dir.glob("sessions/*/meta.json")):
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        slug = meta.get("circuit", {}).get("slug")
        if not slug or not meta.get("track", {}).get("x"):
            continue
        if slug not in latest or (meta.get("date") or "") > (latest[slug].get("date") or ""):
            latest[slug] = meta
    shapes = {}
    for slug, meta in sorted(latest.items()):
        x, y = meta["track"]["x"], meta["track"]["y"]
        step = max(1, math.ceil(len(x) / SHAPE_POINTS))
        shapes[slug] = {
            "session": meta["id"],
            "rotation": meta["circuit"].get("rotation", 0.0),
            "x": x[::step],
            "y": y[::step],
            "corners": [
                {"number": c["number"], "name": c.get("name"), "x": c["x"], "y": c["y"]}
                for c in meta["circuit"].get("corners", [])
            ],
        }
    dump(out_dir / "circuits.json", shapes)
    return shapes
