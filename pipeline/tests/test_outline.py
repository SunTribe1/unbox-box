import math

from unbox_box_pipeline.outline import best_outline, despike, roughness

N = 400


def circle(n=N, r=500.0):
    """A smooth closed track sampled every step of the distance grid."""
    return (
        [r * math.cos(2 * math.pi * i / n) for i in range(n)],
        [r * math.sin(2 * math.pi * i / n) for i in range(n)],
    )


def polygon(n=N, r=500.0, corners=12):
    """The same track when GPS only reported a dozen fixes a lap: straight chords between them."""
    xs, ys = [], []
    for i in range(n):
        f = i / n * corners
        k = int(f)
        a0, a1 = 2 * math.pi * k / corners, 2 * math.pi * (k + 1) / corners
        t = f - k
        xs.append(r * ((1 - t) * math.cos(a0) + t * math.cos(a1)))
        ys.append(r * ((1 - t) * math.sin(a0) + t * math.sin(a1)))
    return xs, ys


def test_sparse_gps_polygon_is_rougher_than_a_smooth_lap():
    assert roughness(*polygon()) > 5 * roughness(*circle())


def test_a_lap_without_position_data_is_unusable():
    assert roughness([0.0] * N, [0.0] * N) == math.inf


def test_best_outline_prefers_the_smooth_lap():
    smooth = circle()
    x, y = best_outline([polygon(), ([0.0] * N, [0.0] * N), smooth])
    assert (x, y) == despike(*smooth)


def test_best_outline_is_none_when_no_lap_has_positions():
    assert best_outline([([0.0] * N, [0.0] * N)]) is None


def test_despike_removes_a_single_glitch_point():
    x, y = circle()
    x[100], y[100] = x[100] + 300.0, y[100] + 300.0
    cx, cy = despike(x, y)
    clean_x, clean_y = circle()
    assert abs(cx[100] - clean_x[100]) < 5 and abs(cy[100] - clean_y[100]) < 5
    assert roughness(cx, cy) < 2 * roughness(clean_x, clean_y)


def test_despike_removes_a_two_point_glitch():
    x, y = circle()
    for i in (100, 101):
        x[i], y[i] = x[i] + 300.0, y[i] + 300.0
    cx, cy = despike(x, y)
    clean_x, clean_y = circle()
    assert roughness(cx, cy) < 2 * roughness(clean_x, clean_y)


def _session(root, sid, slug, season, laps):
    import json

    d = root / "sessions" / sid
    (d / "tel").mkdir(parents=True)
    meta = {"id": sid, "season": season, "circuit": {"slug": slug}, "track": {"x": [], "y": []}}
    (d / "meta.json").write_text(json.dumps(meta))
    for i, (x, y) in enumerate(laps):
        (d / "tel" / f"AAA-{i}.json").write_text(json.dumps({"x": x, "y": y}))


def test_a_session_without_positions_borrows_its_circuits_outline(tmp_path):
    import json

    from unbox_box_pipeline.outline import rebuild_outlines

    zeros = ([0.0] * N, [0.0] * N)
    _session(tmp_path, "2026-monaco-r", "monaco", 2026, [zeros])
    _session(tmp_path, "2026-monaco-q", "monaco", 2026, [circle()])
    _session(tmp_path, "2025-monaco-r", "monaco", 2025, [polygon()])
    rebuild_outlines(tmp_path)
    race = json.loads((tmp_path / "sessions/2026-monaco-r/meta.json").read_text())
    quali = json.loads((tmp_path / "sessions/2026-monaco-q/meta.json").read_text())
    assert race["track"] == quali["track"] and race["track"]["x"]
    # The borrowing is recorded so the app can say where the shape came from.
    assert race["quality"] == {"outline": "borrowed", "from": "2026-monaco-q"}
    assert "quality" not in quali


def test_a_session_whose_laps_are_all_polygons_borrows_a_smooth_outline(tmp_path):
    import json

    from unbox_box_pipeline.outline import rebuild_outlines

    _session(tmp_path, "2026-hungary-r", "hungaroring", 2026, [polygon(), polygon(corners=10)])
    _session(tmp_path, "2026-hungary-q", "hungaroring", 2026, [circle()])
    _session(tmp_path, "2025-hungary-r", "hungaroring", 2025, [circle(r=501.0)])
    rebuild_outlines(tmp_path)
    race = json.loads((tmp_path / "sessions/2026-hungary-r/meta.json").read_text())
    quali = json.loads((tmp_path / "sessions/2026-hungary-q/meta.json").read_text())
    assert race["track"] == quali["track"]


def test_circuit_shapes_keep_the_latest_session_per_circuit_small(tmp_path):
    import json

    from unbox_box_pipeline.outline import build_circuit_shapes

    for sid, season, n in [("2025-monza-r", 2025, 400), ("2026-monza-q", 2026, 400)]:
        _session(tmp_path, sid, "monza", season, [circle(n=n)])
        meta_path = tmp_path / "sessions" / sid / "meta.json"
        meta = json.loads(meta_path.read_text())
        x, y = circle(n=n)
        meta.update(
            track={"x": x, "y": y},
            date=f"{season}-09-01",
            circuit={
                "slug": "monza",
                "rotation": 90.0,
                "corners": [{"number": 1, "name": "Rettifilo", "distance": 1.0, "x": 1, "y": 2}],
            },
        )
        meta_path.write_text(json.dumps(meta))
    shapes = build_circuit_shapes(tmp_path)
    monza = shapes["monza"]
    assert monza["session"] == "2026-monza-q"
    assert monza["rotation"] == 90.0
    assert len(monza["x"]) <= 160 and len(monza["x"]) == len(monza["y"])
    assert monza["corners"] == [{"number": 1, "name": "Rettifilo", "x": 1, "y": 2}]
    assert json.loads((tmp_path / "circuits.json").read_text())["monza"] == monza
