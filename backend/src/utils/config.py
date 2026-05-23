"""Configuration loading helpers."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


def load_yaml(path: str | Path) -> dict[str, Any]:
    """Load a YAML file and return an empty dict when the file is empty."""
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return data or {}
