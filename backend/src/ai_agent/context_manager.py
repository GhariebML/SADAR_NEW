"""Conversation context management for SADAR."""

from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Literal

Role = Literal["system", "user", "assistant", "tool"]


@dataclass(slots=True)
class Message:
    role: Role
    content: str
    timestamp: str


class ContextManager:
    """Keeps bounded conversation history for prompt construction."""

    def __init__(self, max_messages: int = 20) -> None:
        self.messages: deque[Message] = deque(maxlen=max_messages)

    def add(self, role: Role, content: str) -> None:
        self.messages.append(Message(role=role, content=content, timestamp=datetime.now(timezone.utc).isoformat()))

    def as_chat_messages(self) -> list[dict[str, str]]:
        return [{"role": m.role, "content": m.content} for m in self.messages if m.role in {"system", "user", "assistant"}]

    def summary(self) -> str:
        return "\n".join(f"[{m.role}] {m.content}" for m in self.messages)

    def to_dict(self) -> list[dict]:
        return [asdict(m) for m in self.messages]

    def clear(self) -> None:
        self.messages.clear()
