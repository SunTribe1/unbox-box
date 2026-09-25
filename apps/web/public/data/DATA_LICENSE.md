# Data license

Unbox Box's data files are adapted from open datasets. Each keeps its source's licence.

## history/ (all-time data, 1950 onwards)

`history/index.json`, `results.json`, `standings.json`, `catalog.json`, `records.json` and
`seasons/<year>.json` are adapted from F1DB (https://github.com/f1db/f1db) by Marcel Overdijk
and contributors, licensed under Creative Commons Attribution 4.0 International
(https://creativecommons.org/licenses/by/4.0/). These adapted files are distributed under
CC BY 4.0.

Changes: selected tables and columns; dropped non-starts (DNQ, DNS, DNPQ, DNP) from
`results.json`; split every weekend's sessions into one file per season; merged each team's
chassis, engine and tyres per season; converted country ids to ISO codes; derived record
books (closest finishes, winning margins, wins from furthest back, Driver of the Day shares,
pit-crew medians against each race's median); converted to compact JSON.

## sessions/ and circuits.json (telemetry, 2023 onwards)

Adapted from the TracingInsights season archives (https://github.com/TracingInsights,
DOI 10.5281/zenodo.17312802). Each season is its own repository with its own licence:

| Seasons   | Repository                                  | Licence                                   |
| --------- | ------------------------------------------- | ----------------------------------------- |
| 2023–2024 | TracingInsights/2023, TracingInsights/2024  | MIT (`LICENSE-MIT-TracingInsights.txt`)    |
| 2025–2026 | TracingInsights/2025, TracingInsights/2026  | Apache-2.0 (`LICENSE-APACHE-2.0.txt`)      |

Each session's `meta.json` names its source repository and licence under `attribution`.
TracingInsights data is collected with FastF1 (https://github.com/theOehrly/Fast-F1, MIT),
the Jolpica-F1 API (https://github.com/jolpica/jolpica-f1, Apache-2.0) and circuit
information from MultiViewer (https://github.com/f1multiviewer).

Changes made by Unbox Box:

- Selected each driver's best valid lap per qualifying segment.
- Resampled telemetry onto a shared 5 m distance grid.
- Aligned braking zones to the pole lap and derived elapsed time from speed, anchored to
  official sector and lap times.
- For races, converted every lap of every car into per-second track progress for the replay,
  and extracted pit stops, stints, race control messages and on-road classification.
- Built `circuits.json`: one smoothed outline per circuit from its latest session's laps.
- Matched each session to its F1DB race (by season and date) for circuit names and rounds.
- Dropped fields the app doesn't use (including image URLs and team colours) and converted
  to compact JSON.

## Trademarks

Unbox Box is an unofficial, non-commercial fan project and is not associated in any way with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One Licensing B.V. All other names are trade marks of their respective owners, who do not endorse Unbox Box. Full notice: https://unboxbox.com/credits/