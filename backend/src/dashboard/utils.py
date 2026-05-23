"""
utils.py
---------
Utility functions for the Dashboard.
Common helper functions used across multiple pages.
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Any, Optional, Tuple
import os
import json

# Import from project modules
from src.utils.logger import get_logger
from src.utils.config import get_config
from src.database.crud import get_recent_predictions, get_alerts, get_detection_stats
from src.hardware.sdr_controller import get_status as get_sdr_status

logger = get_logger(__name__)
config = get_config()


# ============================================
# CSS Helpers
# ============================================

def load_css_files(css_dir: str = "src/dashboard/assets") -> None:
    """
    Load all CSS files from the assets directory.
    
    Args:
        css_dir: Path to the CSS directory
    """
    css_files = [
        "style.css",
        "theme.css", 
        "typography.css",
        "components.css",
        "animations.css",
        "responsive.css",
    ]
    
    for css_file in css_files:
        css_path = os.path.join(css_dir, css_file)
        if os.path.exists(css_path):
            try:
                with open(css_path, "r") as f:
                    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
            except Exception as e:
                logger.warning(f"Could not load CSS {css_file}: {e}")


def load_logo(logo_path: str = "src/dashboard/assets/logo.png") -> Optional[str]:
    """
    Load logo image and return HTML for display.
    
    Args:
        logo_path: Path to logo image
    
    Returns:
        HTML string for logo display or None if not found
    """
    if os.path.exists(logo_path):
        return f'<img src="{logo_path}" class="logo" width="40">'
    return None


# ============================================
# Data Helpers
# ============================================

def get_system_status() -> Dict[str, Any]:
    """
    Get current system status for all components.
    
    Returns:
        Dictionary with component status
    """
    status = {
        "sdr": {"online": False, "message": "Offline"},
        "model": {"online": True, "message": "Loading..."},
        "database": {"online": False, "message": "Offline"},
        "agent": {"online": False, "message": "Offline"},
        "api": {"online": True, "message": "Running"},
        "timestamp": datetime.now().isoformat(),
    }
    
    # Check SDR status
    try:
        sdr_status = get_sdr_status()
        status["sdr"]["online"] = sdr_status.get("is_connected", False)
        status["sdr"]["message"] = "Online" if status["sdr"]["online"] else "Disconnected"
        if status["sdr"]["online"]:
            status["sdr"]["frequency"] = sdr_status.get("frequency", "N/A")
            status["sdr"]["gain"] = sdr_status.get("gain", "N/A")
    except Exception as e:
        logger.warning(f"SDR status check failed: {e}")
    
    # Check model status
    try:
        from src.ai_model.predict import get_model_status
        model_status = get_model_status()
        status["model"]["online"] = model_status.get("loaded", False)
        status["model"]["message"] = "Loaded" if status["model"]["online"] else "Not loaded"
        if status["model"]["online"]:
            status["model"]["accuracy"] = model_status.get("accuracy", 0.9347)
    except Exception as e:
        logger.warning(f"Model status check failed: {e}")
    
    # Check database
    try:
        from src.database.db_manager import get_db_status
        db_status = get_db_status()
        status["database"]["online"] = db_status.get("connected", False)
        status["database"]["message"] = "Connected" if status["database"]["online"] else "Disconnected"
    except Exception as e:
        logger.warning(f"Database status check failed: {e}")
    
    # Check AI Agent
    try:
        from src.ai_agent.agent import get_agent_status
        agent_status = get_agent_status()
        status["agent"]["online"] = agent_status.get("ready", False)
        status["agent"]["message"] = "Ready" if status["agent"]["online"] else "Not ready"
    except Exception as e:
        logger.warning(f"Agent status check failed: {e}")
    
    return status


def get_detection_summary(hours: int = 24) -> Dict[str, Any]:
    """
    Get detection summary for the specified time period.
    
    Args:
        hours: Number of hours to look back
    
    Returns:
        Dictionary with summary statistics
    """
    try:
        stats = get_detection_stats(hours=hours)
        if stats:
            return stats
    except Exception as e:
        logger.warning(f"Failed to get detection stats: {e}")
    
    # Fallback data
    return {
        "total": 0,
        "drone_count": 0,
        "jamming_count": 0,
        "normal_count": 0,
        "accuracy": 0.9347,
        "drone_percent": 0,
        "jamming_percent": 0,
    }


# ============================================
# Chart Helpers
# ============================================

def create_gauge_chart(value: float, title: str, min_val: float = 0, max_val: float = 1) -> go.Figure:
    """
    Create a gauge chart for confidence or percentage display.
    
    Args:
        value: Current value (0-1)
        title: Chart title
        min_val: Minimum value
        max_val: Maximum value
    
    Returns:
        Plotly figure object
    """
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=value,
        title={"text": title},
        domain={"x": [0, 1], "y": [0, 1]},
        gauge={
            "axis": {"range": [min_val, max_val], "tickwidth": 1},
            "bar": {"color": "#00c851" if value > 0.7 else "#ff8800" if value > 0.5 else "#ff4444"},
            "steps": [
                {"range": [0, 0.5], "color": "rgba(255,68,68,0.2)"},
                {"range": [0.5, 0.85], "color": "rgba(255,136,0,0.2)"},
                {"range": [0.85, 1], "color": "rgba(0,200,81,0.2)"},
            ],
        }
    ))
    fig.update_layout(height=250, margin=dict(l=20, r=20, t=40, b=20))
    return fig


def create_class_distribution_chart(drone_count: int, normal_count: int, jamming_count: int) -> go.Figure:
    """
    Create a pie chart for class distribution.
    
    Args:
        drone_count: Number of drone detections
        normal_count: Number of normal detections
        jamming_count: Number of jamming detections
    
    Returns:
        Plotly figure object
    """
    fig = px.pie(
        values=[drone_count, normal_count, jamming_count],
        names=["Drone", "Normal", "Jamming"],
        color="names",
        color_discrete_map={"Drone": "#ff4444", "Normal": "#00c851", "Jamming": "#ff8800"},
        hole=0.4,
    )
    fig.update_layout(height=300, margin=dict(l=0, r=0, t=0, b=0))
    return fig


def create_trend_chart(data: List[Dict], x_col: str, y_col: str, title: str) -> go.Figure:
    """
    Create a line chart for trend visualization.
    
    Args:
        data: List of dictionaries with data
        x_col: Column name for x-axis
        y_col: Column name for y-axis
        title: Chart title
    
    Returns:
        Plotly figure object
    """
    df = pd.DataFrame(data)
    fig = px.line(
        df,
        x=x_col,
        y=y_col,
        title=title,
        markers=True,
        template="plotly_dark",
    )
    fig.update_layout(height=350, margin=dict(l=10, r=10, t=40, b=10))
    return fig


# ============================================
# Formatting Helpers
# ============================================

def format_timestamp(timestamp_str: str) -> str:
    """
    Format timestamp for display.
    
    Args:
        timestamp_str: ISO format timestamp string
    
    Returns:
        Formatted timestamp string
    """
    try:
        dt = pd.to_datetime(timestamp_str)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return timestamp_str


def format_confidence(confidence: float) -> str:
    """
    Format confidence as percentage.
    
    Args:
        confidence: Float between 0 and 1
    
    Returns:
        Percentage string with one decimal
    """
    return f"{confidence * 100:.1f}%"


def get_threat_color(class_name: str) -> str:
    """
    Get threat color for a class.
    
    Args:
        class_name: Drone, Normal, or Jamming
    
    Returns:
        Hex color code
    """
    colors = {
        "Drone": "#ff4444",
        "Normal": "#00c851",
        "Jamming": "#ff8800",
    }
    return colors.get(class_name, "#666666")


def get_threat_icon(class_name: str) -> str:
    """
    Get threat icon for a class.
    
    Args:
        class_name: Drone, Normal, or Jamming
    
    Returns:
        Unicode emoji icon
    """
    icons = {
        "Drone": "🚁",
        "Normal": "✅",
        "Jamming": "⚠️",
    }
    return icons.get(class_name, "📡")


# ============================================
# Export Helpers
# ============================================

def export_to_csv(df: pd.DataFrame, filename: str) -> bytes:
    """
    Export DataFrame to CSV bytes for download.
    
    Args:
        df: DataFrame to export
        filename: Name of the file (without extension)
    
    Returns:
        CSV data as bytes
    """
    return df.to_csv(index=False).encode("utf-8")


def export_to_json(data: Any, filename: str) -> bytes:
    """
    Export data to JSON bytes for download.
    
    Args:
        data: Data to export
        filename: Name of the file (without extension)
    
    Returns:
        JSON data as bytes
    """
    return json.dumps(data, indent=2, default=str).encode("utf-8")


# ============================================
# Notification Helpers
# ============================================

def show_toast(message: str, icon: str = "🔔", duration: int = 3):
    """
    Show a toast notification.
    
    Args:
        message: Notification message
        icon: Emoji icon
        duration: Duration in seconds
    """
    st.toast(f"{icon} {message}", icon=icon)


def show_success(message: str, duration: int = 3):
    """Show success notification."""
    show_toast(f"✅ {message}", "✅")


def show_error(message: str, duration: int = 5):
    """Show error notification."""
    show_toast(f"❌ {message}", "❌")


def show_warning(message: str, duration: int = 4):
    """Show warning notification."""
    show_toast(f"⚠️ {message}", "⚠️")


# ============================================
# Session State Helpers
# ============================================

def init_session_state(key: str, default_value: Any) -> Any:
    """
    Initialize session state variable if not exists.
    
    Args:
        key: Session state key
        default_value: Default value to set
    
    Returns:
        Current value
    """
    if key not in st.session_state:
        st.session_state[key] = default_value
    return st.session_state[key]


def reset_session_state(keys: List[str]):
    """
    Reset specified session state keys.
    
    Args:
        keys: List of keys to reset
    """
    for key in keys:
        if key in st.session_state:
            del st.session_state[key]


# ============================================
# Display Helpers
# ============================================

def display_metric_card(title: str, value: Any, delta: Optional[float] = None, icon: str = "📊"):
    """
    Display a metric card.
    
    Args:
        title: Metric title
        value: Metric value
        delta: Optional delta value
        icon: Emoji icon
    """
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-icon">{icon}</div>
            <div class="metric-title">{title}</div>
            <div class="metric-value">{value}</div>
            {f'<div class="metric-delta">{delta:+.1f}%</div>' if delta else ''}
        </div>
        """,
        unsafe_allow_html=True,
    )


def display_status_badge(status: str, online: bool) -> str:
    """
    Generate HTML for status badge.
    
    Args:
        status: Component name
        online: Whether online
    
    Returns:
        HTML string for badge
    """
    badge_class = "online" if online else "offline"
    badge_text = "Online" if online else "Offline"
    return f'<span class="status-badge {badge_class}">{badge_text}</span>'


# ============================================
# Page Helpers
# ============================================

def render_page_header(title: str, subtitle: str = "", icon: str = ""):
    """
    Render consistent page header.
    
    Args:
        title: Page title
        subtitle: Page subtitle (optional)
        icon: Emoji icon (optional)
    """
    st.markdown(f'<div class="page-header">', unsafe_allow_html=True)
    st.markdown(f'<h1>{icon} {title}</h1>', unsafe_allow_html=True)
    if subtitle:
        st.markdown(f'<p class="subtitle">{subtitle}</p>', unsafe_allow_html=True)
    st.markdown(f'</div>', unsafe_allow_html=True)
    st.markdown("---")
