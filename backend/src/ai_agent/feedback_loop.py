"""Feedback capture for continuous SADAR AI-agent improvement."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from .config import AgentConfig
from .exceptions import ValidationError

Rating = Literal["positive", "negative", "neutral"]
_VALID_RATINGS: set[str] = {"positive", "negative", "neutral"}


@dataclass(slots=True)
class FeedbackItem:
    question: str
    answer: str
    rating: Rating
    comment: str
    timestamp: str


class FeedbackLoop:
    """Append-only JSONL feedback store."""

    def __init__(self, path: str | Path | None = None, config: AgentConfig | None = None) -> None:
        cfg = config or AgentConfig()
        self.path = Path(path) if path else cfg.feedback_path

    def record(self, question: str, answer: str, rating: Rating = "neutral", comment: str = "") -> FeedbackItem:
        if rating not in _VALID_RATINGS:
            raise ValidationError(f"rating must be one of {sorted(_VALID_RATINGS)}")
        item = FeedbackItem(question, answer, rating, comment, datetime.now(timezone.utc).isoformat())
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(asdict(item), ensure_ascii=False) + "\n")
        return item

    def load_recent(self, limit: int = 50) -> list[FeedbackItem]:
        if not self.path.exists():
            return []
        lines = self.path.read_text(encoding="utf-8").splitlines()[-max(limit, 0):]
        items: list[FeedbackItem] = []
        for line in lines:
            if not line.strip():
                continue
            try:
                items.append(FeedbackItem(**json.loads(line)))
            except (json.JSONDecodeError, TypeError):
                continue
        return items
