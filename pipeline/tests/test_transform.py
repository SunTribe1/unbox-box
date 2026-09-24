import math

from unbox_box_pipeline.model import Lap, Telemetry
from unbox_box_pipeline.transform import classify, laps_worth_telemetry, resample


def lap(driver, n, time, segment=None, deleted=False):
    return Lap(driver, n, time, None, None, None, "SOFT", segment, deleted, None)


def test_classify_orders_by_furthest_segment_then_time():
    laps = [
        lap("AAA", 1, 80.0, "Q1"),
        lap("AAA", 2, 79.0, "Q2"),
        lap("BBB", 1, 79.5, "Q1"),
        lap("BBB", 2, 78.9, "Q2"),
        lap("BBB", 3, 78.5, "Q3"),
        lap("CCC", 1, 78.0, "Q1"),  # fastest lap overall, but knocked out in Q1
    ]
    order = [c.driver for c in classify(["AAA", "BBB", "CCC"], laps)]
    assert order == ["BBB", "AAA", "CCC"]


def test_deleted_laps_never_count():
    laps = [lap("AAA", 1, 77.0, deleted=True), lap("AAA", 2, 80.0)]
    best = classify(["AAA"], laps)[0].best
    assert best is not None and best.lap == 2


def test_laps_worth_telemetry_picks_best_per_segment():
    laps = [lap("AAA", 1, 80.0, "Q1"), lap("AAA", 2, 79.8, "Q1"), lap("AAA", 3, 79.0, "Q2")]
    assert [x.lap for x in laps_worth_telemetry(laps)] == [2, 3]


def test_resample_is_linear_for_continuous_and_held_for_gear():
    n = 11
    tel = Telemetry(
        driver="AAA",
        lap=1,
        time=[i * 1.0 for i in range(n)],
        distance=[i * 10.0 for i in range(n)],
        rel_distance=[i / (n - 1) for i in range(n)],
        speed=[100.0 + i for i in range(n)],
        throttle=[100.0] * n,
        brake=[0.0] * n,
        gear=[3.0 if i < 5 else 4.0 for i in range(n)],
        rpm=[10000.0] * n,
        drs=[0.0] * n,
        x=[float(i) for i in range(n)],
        y=[0.0] * n,
        z=[0.0] * n,
    )
    out = resample(tel, length=100.0, step=5.0)
    assert len(out["t"]) == 20
    # 5 m at ~100 km/h (27.8 m/s) takes ~0.18 s
    assert math.isclose(out["t"][1], 5 / (100.25 / 3.6), rel_tol=1e-2)
    assert out["gear"][9] == 3  # 45 m: still in 3rd until the 50 m sample
    assert out["gear"][10] == 4


def test_resample_scales_time_to_official_lap_time():
    n = 11
    tel = Telemetry(
        "AAA",
        1,
        [i * 1.0 for i in range(n)],
        [i * 10.0 for i in range(n)],
        [i / (n - 1) for i in range(n)],
        [36.0] * n,
        [100.0] * n,
        [0.0] * n,
        [3.0] * n,
        [1.0] * n,
        [0.0] * n,
        [0.0] * n,
        [0.0] * n,
        [0.0] * n,
    )
    # 36 km/h = 10 m/s, so the lap (100 m) naturally takes 10 s; official time says 12 s.
    out = resample(tel, length=100.0, step=5.0, lap_time=12.0)
    assert math.isclose(out["t"][-1], 12.0 * 95 / 100, rel_tol=1e-3)


def test_sector_anchors_are_hit_exactly():
    n = 21
    tel = Telemetry(
        "AAA",
        1,
        [float(i) for i in range(n)],
        [i * 10.0 for i in range(n)],
        [i / (n - 1) for i in range(n)],
        [36.0] * n,
        [100.0] * n,
        [0.0] * n,
        [3.0] * n,
        [1.0] * n,
        [0.0] * n,
        [0.0] * n,
        [0.0] * n,
        [0.0] * n,
    )
    out = resample(
        tel, 200.0, 5.0, lap_time=24.0, sector_marks=[50.0, 150.0], sector_times=[4.0, 12.0, 8.0]
    )
    assert math.isclose(out["t"][10], 4.0, abs_tol=1e-3)  # 50 m
    assert math.isclose(out["t"][30], 16.0, abs_tol=1e-3)  # 150 m


def test_warp_pins_apexes_to_reference():
    import numpy as np

    from unbox_box_pipeline.transform import warp_to_reference

    pos = np.array([0.0, 100.0, 210.0, 300.0, 400.0])
    warped = warp_to_reference(pos, [210.0, None], [200.0, 350.0], length=400.0)
    assert warped[0] == 0.0 and warped[-1] == 400.0
    assert math.isclose(warped[2], 200.0)


def race_lap(driver, n, start, time, pit_in=None, pit_out=None, compound="MEDIUM", stint=1):
    return Lap(
        driver,
        n,
        time,
        None,
        None,
        None,
        compound,
        None,
        False,
        None,
        start=start,
        pit_in=pit_in,
        pit_out=pit_out,
        stint=stint,
        tyre_life=n,
    )


def test_classify_race_orders_by_laps_then_finish_and_flags_dnf():
    from unbox_box_pipeline.replay import classify_race

    laps = [
        race_lap("AAA", 1, 0, 90),
        race_lap("AAA", 2, 90, 90),  # finishes at 180
        race_lap("BBB", 1, 0, 91),
        race_lap("BBB", 2, 91, 91),  # finishes at 182
        race_lap("CCC", 1, 0, 95),  # stops at 95: DNF
        Lap("DDD", 1, None, None, None, None, None, None, False, None),  # never started
    ]
    results = classify_race(["CCC", "BBB", "AAA", "DDD"], laps)
    assert [(r.driver, r.status) for r in results] == [
        ("AAA", "Finished"),
        ("BBB", "Finished"),
        ("CCC", "+1 Lap"),
        ("DDD", "DNS"),
    ]


def test_track_status_pairs_start_and_end_messages():
    from unbox_box_pipeline.replay import track_status

    periods = track_status(
        [
            {"t": 100, "message": "SAFETY CAR DEPLOYED"},
            {"t": 400, "message": "SAFETY CAR IN THIS LAP"},
            {"t": 900, "message": "VIRTUAL SAFETY CAR DEPLOYED"},
        ],
        race_end=1000,
    )
    assert periods == [
        {"status": "sc", "from": 100, "to": 400},
        {"status": "vsc", "from": 900, "to": 1000},
    ]


def test_progress_series_is_monotonic_and_ends_on_whole_laps():
    import numpy as np

    from unbox_box_pipeline.replay import progress_series

    laps = [race_lap("AAA", 1, 10, 90), race_lap("AAA", 2, 100, 88)]
    t, p = progress_series(laps, {})
    assert np.all(np.diff(t) > 0) and np.all(np.diff(p) >= 0)
    assert p[-1] == 2.0 and t[-1] == 188


def test_progress_reaches_the_finish_when_telemetry_ends_on_the_line():
    from unbox_box_pipeline.replay import progress_series

    tel = Telemetry(
        "AAA", 1, [0.0, 45.0, 90.0], [0, 2900, 5790], [0.0, 0.5, 0.997], *([[0.0] * 3] * 9)
    )
    t, p = progress_series([race_lap("AAA", 1, 10, 90)], {1: tel})
    assert p[-1] == 1.0 and t[-1] == 100


def test_lap_one_progress_counts_from_the_start_line_not_the_grid_slot():
    from unbox_box_pipeline.replay import progress_series

    # Pole starts 10 m behind the line, P20 starts 200 m behind it (lap length 5000 m).
    # Both lap-1 traces start at distance 0, so rel_distance alone can't tell them apart.
    def lap_one(driver, total):
        return Telemetry(
            driver,
            1,
            [0.0, 50.0, 100.0],
            [0.0, total / 2, total],
            [0.0, 0.5, 1.0],
            *([[0.0] * 3] * 9),
        )

    laps = {"POL": race_lap("POL", 1, 0, 100), "P20": race_lap("P20", 1, 0, 100)}
    _, pole = progress_series([laps["POL"]], {1: lap_one("POL", 5010.0)}, lap_length=5000.0)
    _, back = progress_series([laps["P20"]], {1: lap_one("P20", 5200.0)}, lap_length=5000.0)
    assert pole[0] < 0 and back[0] < pole[0]  # behind the line, P20 further back
    assert abs(pole[0] - (-10 / 5000)) < 1e-9
    assert abs(back[0] - (-200 / 5000)) < 1e-9
    assert pole[-1] == 1.0 and back[-1] == 1.0


def test_red_flag_overrides_an_open_safety_car_and_ends_only_on_restart():
    from unbox_box_pipeline.replay import track_status

    periods = track_status(
        [
            {"t": 198, "message": "SAFETY CAR DEPLOYED"},
            {"t": 252, "message": "RED FLAG - RACE SUSPENDED"},
            {"t": 354, "message": "TRACK CLEAR"},  # marshals done; still suspended
            {"t": 1459, "message": "RACE WILL RESUME AT 15:39"},
            {"t": 1829, "message": "SAFETY CAR LIGHTS ON"},
            {"t": 2190, "message": "STANDING START"},
        ],
        race_end=5000,
    )
    assert periods == [
        {"status": "sc", "from": 198, "to": 252},
        {"status": "red", "from": 252, "to": 1829},
    ]


def test_red_flag_ends_at_a_rolling_restart_or_the_flag():
    from unbox_box_pipeline.replay import track_status

    rolling = track_status(
        [
            {"t": 7027, "message": "RED FLAG"},
            {"t": 8922, "message": "RACE WILL RESUME AT 17:33 - ROLLING START PROCEDURE"},
            {"t": 9047, "message": "SAFETY CAR WILL ENTER PITS: ROLLING START PROCEDURE"},
            {"t": 9159, "message": "CHEQUERED FLAG"},
        ],
        race_end=11001,
    )
    assert rolling == [{"status": "red", "from": 7027, "to": 9047}]
    flag = track_status(
        [{"t": 10, "message": "RED FLAG"}, {"t": 90, "message": "CHEQUERED FLAG"}], 200
    )
    assert flag == [{"status": "red", "from": 10, "to": 90}]


def test_red_flag_falls_back_to_racing_signals_and_ignores_post_race_messages():
    from unbox_box_pipeline.replay import track_status

    periods = track_status(
        [
            {"t": 192, "message": "RED FLAG"},
            {"t": 1538, "message": "RACE WILL RESUME AT 14:31 - STANDING START PROCEDURE"},
            {"t": 1643, "message": "ALL CARS MAY OVERTAKE THE SAFETY CAR"},
            {"t": 7000, "message": "CHEQUERED FLAG"},
            {"t": 7100, "message": "RED FLAG"},
        ],
        race_end=7200,
    )
    assert periods == [{"status": "red", "from": 192, "to": 1643}]
