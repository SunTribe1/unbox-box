# ADR 0003: How lap-vs-lap time gaps are computed

**Status:** accepted · 2026-09-23

## Context

Comparing two laps needs the time gap at every point on track. Raw telemetry mixes two feeds
at different rates, and integrated distance drifts by tens of metres between laps. A naive
delta shows swings of several tenths that never happened.

## Decision

In the pipeline, for every lap:

1. Resample onto a shared 5 m distance grid.
2. Pin each lap's slowest point in every real braking corner to the pole lap's, warping
   distance linearly in between.
3. Derive elapsed time from speed (integral of dx / v) instead of the raw time channel.
4. Rescale time piecewise so it hits the lap's official sector splits and lap time exactly.

## Consequences

- Section and mini-sector deltas sum exactly to the official gap (unit-tested).
- Short swings can remain inside braking zones; the UI says so next to the Gap chart.
