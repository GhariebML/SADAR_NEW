"""Persistent response cache for the SADAR AI agent."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import AgentConfig

logger = logging.getLogger(__name__)


class ResponseCache:
    """Small JSON-backed cache keyed by normalized question text."""

    def __init__(self, path: str | Path | None = None, config: AgentConfig | None = None) -> None:
        cfg = config or AgentConfig()
        self.path = Path(path) if path else cfg.response_cache_path
        self._data: dict[str, Any] = {"items": {}}
        self.load()

    def load(self) -> None:
        if not self.path.exists():
            self._data = {"items": {}}
            return
        try:
            self._data = json.loads(self.path.read_text(encoding="utf-8"))
            self._data.setdefault("items", {})
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Could not load response cache %s: %s", self.path, exc)
            self._data = {"items": {}}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp_path.write_text(json.dumps(self._data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(self.path)

    def get(self, key: str) -> dict[str, Any] | None:
        return self._data.get("items", {}).get(self._hash(key))

    def set(self, key: str, value: dict[str, Any]) -> None:
        item = {**value, "cached_at": datetime.now(timezone.utc).isoformat()}
        self._data.setdefault("items", {})[self._hash(key)] = item
        self.save()

    def clear(self) -> None:
        self._data = {"items": {}}
        self.save()

    @staticmethod
    def _hash(text: str) -> str:
        return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()
