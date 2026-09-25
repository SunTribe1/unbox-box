"""The contract every data source implements (dependency inversion: the pipeline depends on
this protocol, never on a concrete source)."""

from __future__ import annotations

from typing import Protocol

from ..model import Driver, Lap, SessionData, Telemetry


class SessionSource(Protocol):
    name: str

    def load_session(self, season: int, event: str, session: str) -> SessionData:
        """Drivers, laps, corners and weather, without telemetry."""

    def load_telemetry(self, season: int, event: str, session: str, lap: Lap) -> Telemetry:
        """Raw telemetry for one lap."""


__all__ = ["SessionSource", "Driver", "Lap", "SessionData", "Telemetry"]
