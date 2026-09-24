"""Writes the static files the web app reads. Output layout:

data/index.json                      list of sessions
data/sessions/<id>/meta.json         drivers, results, laps, circuit, track outline
data/sessions/<id>/tel/<DRV>-<lap>.json  one lap resampled on the shared distance grid
"""

from __future__ import annotations

import json
import os
import re
import unicodedata
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1


def slugify(text: str) -> str:
    """'São Paulo Grand Prix' -> 'sao-paulo-grand-prix' (accents dropped, not split)."""
    plain = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")


def session_id(season: int, event: str, session: str) -> str:
    short = {"qualifying": "q", "race": "r", "sprint": "s", "sprint qualifying": "sq"}
    return f"{season}-{slugify(event)}-{short.get(session.lower(), slugify(session))}"


def dump(path: Path, data: Any) -> int:
    """Writes JSON atomically (temp file + rename), so a crash never leaves a half file that
    a later sync would mistake for a finished build."""
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
    tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)
    return len(text.encode("utf-8"))


def update_index(out_dir: Path, entry: dict[str, Any]) -> None:
    index_path = out_dir / "index.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else {"sessions": []}
    sessions = [s for s in index["sessions"] if s["id"] != entry["id"]]
    sessions.append(entry)
    sessions.sort(key=lambda s: (s.get("date") or "", s["id"]), reverse=True)
    dump(index_path, {"schemaVersion": SCHEMA_VERSION, "sessions": sessions})


def rebuild_index(out_dir: Path, published: list[dict[str, Any]] | None = None) -> int:
    """Rewrites index.json from the meta.json files on disk, so removed or renamed sessions
    never linger. `published` entries (the live index, when syncing in CI with an empty
    folder) are kept unless rebuilt here. Returns the number of sessions."""
    entries: list[dict[str, Any]] = []
    for meta_path in sorted((out_dir / "sessions").glob("*/meta.json")):
        try:
            meta = json.loads(meta_path.read_text())
        except ValueError:
            continue  # corrupt: left out of the index until the next sync rebuilds it
        entries.append(
            {
                "id": meta["id"],
                "season": meta["season"],
                "round": meta.get("round"),
                "event": meta["event"],
                "session": meta["session"],
                "date": meta["date"],
                "circuit": meta["circuit"]["name"],
                "circuitId": meta["circuit"].get("slug"),
                "country": meta["circuit"].get("country"),
            }
        )
    local = {e["id"] for e in entries}
    entries += [e for e in published or [] if e["id"] not in local]
    entries.sort(key=lambda e: (e.get("date") or "", e["id"]), reverse=True)
    dump(out_dir / "index.json", {"schemaVersion": SCHEMA_VERSION, "sessions": entries})
    return len(entries)
