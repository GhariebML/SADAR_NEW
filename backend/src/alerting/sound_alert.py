"""Local sound alert placeholder backend."""

from __future__ import annotations

from .alert_manager import AlertMessage


def play_sound_alert(message: AlertMessage) -> bool:
    return bool(message.label)
