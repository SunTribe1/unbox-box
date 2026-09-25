"""Uploads the data folder to a public Hugging Face dataset, which the web app reads as its
CDN (NEXT_PUBLIC_DATA_BASE). Hugging Face deduplicates content, so unchanged files cost no
upload time. Needs `pip install "huggingface_hub>=0.25,<2"` (2.0 removed upload_large_folder)
and a write token (`hf auth login` or HF_TOKEN)."""

from __future__ import annotations

import shutil
from pathlib import Path

# 2.0 removed upload_large_folder; the workflow and npm script pin the same range.
HUB_REQUIREMENT = "huggingface_hub>=0.25,<2"

LICENSE_FILES = Path(__file__).resolve().parents[2] / "apps" / "web" / "public" / "data"

DATASET_CARD = """---
license: other
license_name: cc-by-4.0-mit-and-apache-2.0
pretty_name: Unbox Box F1 session data
tags: [formula1, motorsport, telemetry]
---

# Unbox Box F1 session data

Static JSON served to the Unbox Box web app: per-session metadata, resampled lap telemetry and
race replays, plus all-time history.

Sources: TracingInsights (MIT for 2023–2024, Apache-2.0 from 2025; FastF1-derived) and F1DB
(CC BY 4.0, Marcel Overdijk and contributors). Data was converted and resampled.
Unofficial fan project, not affiliated with Formula 1 companies. See `DATA_LICENSE.md` for details.
"""


def base_url(repo_id: str) -> str:
    return f"https://huggingface.co/datasets/{repo_id}/resolve/main"


def publish(out_dir: Path, repo_id: str) -> str:
    try:
        from huggingface_hub import HfApi
    except ImportError as error:
        raise SystemExit(f"Install the uploader first: pip install '{HUB_REQUIREMENT}'") from error

    api = HfApi()
    if not hasattr(api, "upload_large_folder"):
        raise SystemExit(f"This huggingface_hub is too new; install '{HUB_REQUIREMENT}'")
    api.create_repo(repo_id, repo_type="dataset", exist_ok=True, private=False)
    for name in ("DATA_LICENSE.md", "LICENSE-APACHE-2.0.txt", "LICENSE-MIT-TracingInsights.txt"):
        if not (out_dir / name).exists():
            shutil.copy(LICENSE_FILES / name, out_dir / name)
    readme = out_dir / "README.md"
    if not readme.exists():
        readme.write_text(DATASET_CARD)
    api.upload_large_folder(
        repo_id=repo_id,
        repo_type="dataset",
        folder_path=str(out_dir),
        allow_patterns=["*.json", "*.md", "*.txt"],
        ignore_patterns=["sync-report.json"],
    )
    return base_url(repo_id)
