from unbox_box_pipeline.cli import sync_exit_code, sync_summary
from unbox_box_pipeline.model import Corner
from unbox_box_pipeline.sources.tracinginsights import parse_corners


def test_corners_parsed_with_rotation():
    raw = {"CornerNumber": [1, 2], "Distance": [310.5, 820], "X": [1.0, 2], "Y": [3, 4.0]}
    corners, rotation = parse_corners({**raw, "Rotation": 92})
    assert corners == [
        Corner(number=1, distance=310.5, x=1.0, y=3.0),
        Corner(number=2, distance=820.0, x=2.0, y=4.0),
    ]
    assert rotation == 92.0


def test_missing_corners_file_builds_without_markers():
    # 2026 Spanish and Bahrain GPs shipped without corners.json upstream.
    assert parse_corners(None) == ([], 0.0)


def test_sync_succeeds_only_without_failures():
    assert sync_exit_code({"built": ["a"], "failed": []}) == 0
    assert sync_exit_code({"built": [], "failed": [{"session": "x", "error": "y"}]}) == 1


def test_summary_lists_each_failure():
    report = {
        "built": ["2026-azerbaijan-grand-prix-r"],
        "failed": [{"session": "2026 Spanish Grand Prix Race", "error": "boom"}],
    }
    text = sync_summary(report)
    assert "Built 1, failed 1" in text
    assert "2026 Spanish Grand Prix Race" in text
    assert "boom" in text
