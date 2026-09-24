"""Source-agnostic data model. Every source adapter produces these types (Liskov: any
source can replace another), and every writer consumes only these types."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Driver:
    code: str
    number: str
    first_name: str
    last_name: str
    team: str


@dataclass(frozen=True)
class Lap:
    driver: str
    lap: int
    time: float | None  # seconds; None when no valid time was set
    s1: float | None
    s2: float | None
    s3: float | None
    compound: str | None
    segment: str | None  # "Q1" | "Q2" | "Q3" for qualifying
    deleted: bool
    speed_trap: float | None
    # Race fields (session time in seconds; None when unknown).
    start: float | None = None
    pit_in: float | None = None
    pit_out: float | None = None
    position: int | None = None
    stint: int | None = None
    tyre_life: int | None = None


@dataclass(frozen=True)
class Telemetry:
    """Raw per-sample channels for one lap, time in seconds from lap start."""

    driver: str
    lap: int
    time: list[float]
    distance: list[float]
    rel_distance: list[float]
    speed: list[float]
    throttle: list[float]
    brake: list[float]
    gear: list[float]
    rpm: list[float]
    drs: list[float]
    x: list[float]
    y: list[float]
    z: list[float]


@dataclass(frozen=True)
class Corner:
    number: int
    distance: float
    x: float
    y: float


@dataclass
class SessionData:
    season: int
    event: str
    session: str
    date: str | None
    drivers: list[Driver]
    laps: list[Lap]
    corners: list[Corner]
    rotation: float
    air_temp: float | None = None
    track_temp: float | None = None
    source_name: str = ""
    source_url: str = ""
    source_license: str = ""
    telemetry: dict[tuple[str, int], Telemetry] = field(default_factory=dict)
    # Seconds to add to session time to get a UTC timestamp (epoch seconds).
    utc_offset: float | None = None
    race_control: list[dict] = field(default_factory=list)
