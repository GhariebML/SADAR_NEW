"""
src/dashboard/pages/__init__.py
-------------------------------
Makes the pages directory a Python package.
Exports the page functions for the dashboard.
"""

from .home import show_home
from .realtime import show_realtime
from .history import show_history
from .alerts_log import show_alerts_log
from .analytics import show_analytics
from .reports import show_reports
from .live_map import show_live_map
from .agent_chat import show_agent_chat
from .system_monitor import show_system_monitor

__all__ = [
    "show_home",
    "show_realtime",
    "show_history",
    "show_alerts_log",
    "show_analytics",
    "show_reports",
    "show_live_map",
    "show_agent_chat",
    "show_system_monitor",
]
