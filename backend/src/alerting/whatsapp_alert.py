"""WhatsApp alert placeholder backend.

External message delivery must be explicitly configured before use.
"""

from __future__ import annotations

from .alert_manager import AlertMessage


def send_whatsapp_alert(message: AlertMessage) -> bool:
    return bool(message.label and message.channel == "whatsapp")
