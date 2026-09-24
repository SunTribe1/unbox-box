"""Canonical session names, the folder names upstream uses for them, and CLI parsing."""

from __future__ import annotations

# Canonical name -> upstream folder names, tried in order. F1 renamed the sprint
# qualifying session "Sprint Shootout" for 2023 only.
SESSIONS: dict[str, tuple[str, ...]] = {
    "Qualifying": ("Qualifying",),
    "Race": ("Race",),
    "Sprint": ("Sprint",),
    "Sprint Qualifying": ("Sprint Qualifying", "Sprint Shootout"),
}

SHORT = {"q": "Qualifying", "r": "Race", "s": "Sprint", "sq": "Sprint Qualifying"}

_NOT_EVENTS = ("cache", "schemas", "pre-season", "testing")


def canonical_session(name: str) -> str:
    key = name.strip().lower()
    for canonical, upstream in SESSIONS.items():
        if key in (canonical.lower(), *(u.lower() for u in upstream)):
            return canonical
    if key in SHORT:
        return SHORT[key]
    raise ValueError(f"Unsupported session {name!r}. Use one of: {', '.join(SESSIONS)}.")


def upstream_names(session: str) -> tuple[str, ...]:
    return SESSIONS[canonical_session(session)]


def is_event_folder(name: str) -> bool:
    """Grand Prix folders only: no dot-folders, caches, schemas or testing."""
    lower = name.lower()
    if name.startswith(".") or any(lower.startswith(p) or p in lower for p in _NOT_EVENTS):
        return False
    return lower.endswith("grand prix")


def parse_seasons(text: str) -> list[int]:
    seasons: set[int] = set()
    for part in text.split(","):
        part = part.strip()
        if "-" in part:
            start, end = (int(x) for x in part.split("-", 1))
            seasons.update(range(start, end + 1))
        elif part:
            seasons.add(int(part))
    return sorted(seasons)


def parse_sessions(text: str) -> list[str]:
    if text.strip().lower() == "all":
        return list(SESSIONS)
    return [canonical_session(part) for part in text.split(",") if part.strip()]
