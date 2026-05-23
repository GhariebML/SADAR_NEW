"""
system_monitor.py
-----------------
System monitor page for the RF Spectrum Anomaly Detection Dashboard.
"""
from __future__ import annotations

import streamlit as st
import requests
import os

from src.dashboard.data_provider import get_all_data

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000") + "/api/v1"

COLORS = {"Drone": "#ff4444", "Jamming": "#ff8800", "Normal": "#00c851"}
ICONS  = {"Drone": "🚁", "Jamming": "⚠️", "Normal": "✅"}


def check(url, method="GET", json=None, timeout=2):
    try:
        r = (
            requests.post(url, json=json, timeout=timeout)
            if method == "POST"
            else requests.get(url, timeout=timeout)
        )
        if r.ok:
            return ("🟢 Online", r.json(), r.elapsed.total_seconds() * 1000)
        return (f"🔴 Error {r.status_code}", {}, 0)
    except Exception as e:
        return ("🔴 Offline", {"error": str(e)}, 0)


def show_system_monitor():
    """Render the system monitor page."""
    st.caption("Health status of all SADAR system components.")

    if st.button("🔄 Refresh"):
        get_all_data.clear()
        st.rerun()

    st.markdown("### 🖥️ Component Status")
    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**🔵 Spectrum API**")
        status, detail, ms = check(f"{API_BASE_URL}/health", timeout=2)
        online = "Online" in status
        color  = "#00c851" if online else "#ff4444"
        st.markdown(
            f"""
            <div style="background:{color}22;border:1px solid {color};border-radius:8px;padding:16px;margin-bottom:8px;">
                <div style="font-size:1.5rem;font-weight:bold;color:{color};">{status}</div>
                <div style="color:#aaa;">Response: {ms:.0f} ms</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if detail:
            with st.expander("Details"):
                st.json(detail)

    with col2:
        st.markdown("**🤖 AI Agent**")
        status, detail, ms = check(f"{API_BASE_URL}/agent/health", timeout=2)
        online = "Online" in status
        color  = "#00c851" if online else "#ff4444"
        st.markdown(
            f"""
            <div style="background:{color}22;border:1px solid {color};border-radius:8px;padding:16px;margin-bottom:8px;">
                <div style="font-size:1.5rem;font-weight:bold;color:{color};">{status}</div>
                <div style="color:#aaa;">Response: {ms:.0f} ms</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if detail:
            with st.expander("Details"):
                st.json(detail)

    st.markdown("---")
    st.markdown("### 📈 Database Summary")

    data = get_all_data()

    if not data["api_ok"]:
        st.warning("⚠️ Cannot reach API — statistics unavailable")
    else:
        c1, c2, c3 = st.columns(3)
        c1.metric("📡 Total Signals", data["total_signals"])
        c2.metric("🚨 Total Alerts",  data["alert_count"])
        c3.metric("🎯 Threshold",     f"{data['threshold']:.0%}")

        # ✅ Cards بدل JSON خام
        if data["label_counts"]:
            st.markdown("#### 🏷️ Label Breakdown")
            cols = st.columns(len(data["label_counts"]))
            for col, (label_name, count) in zip(cols, data["label_counts"].items()):
                icon  = ICONS.get(label_name, "📡")
                color = COLORS.get(label_name, "#888")
                col.markdown(
                    f"""
                    <div style="
                        background: {color}22;
                        border: 1px solid {color};
                        border-radius: 8px;
                        padding: 16px;
                        text-align: center;
                    ">
                        <div style="font-size: 2rem;">{icon}</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: {color};">{count}</div>
                        <div style="color: #aaa; font-size: 0.9rem;">{label_name}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

    st.markdown("---")
    st.markdown("### ℹ️ System Info")
    st.markdown(
        """
        <div style="background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:16px;">
            <p><b>🛰️ SADAR</b> — Spectrum Anomaly Detection & Response</p>
            <p><b>Version:</b> 1.0.0 &nbsp;|&nbsp; <b>Competition:</b> ITC-EGYPT 2026</p>
            <p><b>AI Model:</b> EfficientNet-B0 (93.47% Accuracy)</p>
            <p><b>Agent:</b> RAG + Ollama &nbsp;|&nbsp; <b>Hardware:</b> RTL-SDR Compatible</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
