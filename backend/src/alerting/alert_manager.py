"""Alert routing manager."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class AlertMessage:
    label: str
    confidence: float
    location: str = "Unknown"
    channel: str = "email"


class AlertManager:
    """Small pluggable alert dispatcher used by demos/tests."""

    def __init__(self):
        self.sent: list[AlertMessage] = []

    def send(self, message: AlertMessage) -> bool:
        self.sent.append(message)
        return True
