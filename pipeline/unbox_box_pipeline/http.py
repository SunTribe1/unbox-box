"""Tiny cached HTTP client. Every request sends our User-Agent and is cached on disk so
re-runs never hit upstream servers twice. Safe to call from worker threads."""

from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from . import USER_AGENT

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"


PREFIX_CHARS = 180  # readable, prunable part of a cache filename


def _cache_file(url: str) -> Path:
    """A readable prefix (so a whole session can be pruned by URL prefix) plus a hash of the
    full URL, so long URLs sharing a prefix never collide."""
    quoted = urllib.parse.quote(url, safe="")
    digest = hashlib.sha256(url.encode()).hexdigest()[:16]
    return CACHE_DIR / f"{quoted[:PREFIX_CHARS]}~{digest}"


def _request(url: str, method: str = "GET") -> urllib.request.Request:
    headers = {"User-Agent": USER_AGENT}
    token = os.environ.get("GITHUB_TOKEN")
    if token and url.startswith("https://api.github.com/"):
        headers["Authorization"] = f"Bearer {token}"
    return urllib.request.Request(url, headers=headers, method=method)


def get_json(url: str, *, min_interval: float = 0.2, retries: int = 3, cache: bool = True) -> Any:
    cache_file = _cache_file(url)
    if cache and cache_file.exists():
        return json.loads(cache_file.read_text())

    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(_request(url), timeout=60) as response:
                payload = response.read()
            data = json.loads(payload)
            if cache:
                CACHE_DIR.mkdir(parents=True, exist_ok=True)
                tmp = cache_file.with_name(f"{cache_file.name}.{os.getpid()}.{id(payload)}.tmp")
                tmp.write_bytes(payload)
                os.replace(tmp, cache_file)  # atomic: readers never see a half-written file
            time.sleep(min_interval)  # be polite to volunteer-run hosts
            return data
        except urllib.error.HTTPError as error:
            if error.code == 404:
                raise FileNotFoundError(url) from error
            last_error = error
        except Exception as error:  # noqa: BLE001 - retried, then re-raised
            last_error = error
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}") from last_error


def exists(url: str) -> bool:
    """HEAD probe; a cached copy counts as existing."""
    if _cache_file(url).exists():
        return True
    try:
        with urllib.request.urlopen(_request(url, "HEAD"), timeout=30) as response:
            return response.status == 200
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return False
        raise


def prune_cache(url_prefix: str) -> int:
    """Deletes cached responses whose URL starts with `url_prefix`. Returns files removed."""
    if not CACHE_DIR.exists():
        return 0
    prefix = urllib.parse.quote(url_prefix, safe="")[:PREFIX_CHARS]
    removed = 0
    for path in CACHE_DIR.iterdir():
        if path.name.startswith(prefix):
            path.unlink(missing_ok=True)
            removed += 1
    return removed
