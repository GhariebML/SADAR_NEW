"""
realtime.py
-----------
Real-time monitoring page for the RF Spectrum Anomaly Detection Dashboard.
"""
from __future__ import annotations

import time
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from src.dashboard.data_provider import get_all_data

COLORS = {"Drone": "#ff4444", "Jamming": "#ff8800", "Normal": "#00c851"}
LABEL_COLORS = {
    "Normal":  "background-color:#0d2b0d;color:#00c851;font-weight:600;",
    "Jamming": "background-color:#2b1a0d;color:#ff8800;font-weight:600;",
    "Drone":   "background-color:#2b0d0d;color:#ff4444;font-weight:600;",
}


def color_label(val):
    return LABEL_COLORS.get(val, "")


def show_realtime():
    """Render the real-time monitoring page."""

    # ── Header ──────────────────────────────────────────────────
    col_title, col_toggle, col_refresh = st.columns([3, 1, 1])
    with col_title:
        st.caption("Live signal stream — updates every 5 seconds when enabled.")
    with col_toggle:
        auto_refresh = st.toggle("🔄 Auto (5s)", value=False)
    with col_refresh:
        if st.button("⟳ Refresh Now", use_container_width=True):
            get_all_data.clear()
            st.rerun()

    # ── Data ────────────────────────────────────────────────────
    data         = get_all_data(limit=20)
    label_counts = data["label_counts"]
    signals      = data["signals"]
    alerts       = data["alerts"]

    if not data["api_ok"]:
        st.warning("⚠️ API Offline — showing cached data")

    # ── KPIs ────────────────────────────────────────────────────
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("🛰️ Total Signals", data["total_signals"])
    c2.metric("🚨 Alerts",        data["alert_count"])
    c3.metric("⚠️ Jamming",       label_counts.get("Jamming", 0))
    c4.metric("🚁 Drone",         label_counts.get("Drone", 0))
    c5.metric("✅ Normal",         label_counts.get("Normal", 0))

    st.markdown("---")

    # ── Donut + Gauge ────────────────────────────────────────────
    if label_counts:
        col_donut, col_gauge = st.columns(2)

        with col_donut:
            st.markdown("#### 🏷️ Signal Mix")
            fig_donut = px.pie(
                values=list(label_counts.values()),
                names=list(label_counts.keys()),
                color=list(label_counts.keys()),
                color_discrete_map=COLORS,
                hole=0.55,
                template="plotly_dark",
            )
            fig_donut.update_traces(textposition="outside", textinfo="percent+label")
            fig_donut.update_layout(
                height=260, margin=dict(l=10, r=10, t=10, b=10), showlegend=False
            )
            st.plotly_chart(fig_donut, use_container_width=True)

        with col_gauge:
            st.markdown("#### 🎯 Anomaly Rate")
            total     = sum(label_counts.values()) or 1
            anomalies = sum(v for k, v in label_counts.items() if k != "Normal")
            rate      = anomalies / total * 100
            clr       = "#ff4444" if rate > 30 else "#ff8800" if rate > 10 else "#00c851"

            fig_gauge = go.Figure(go.Indicator(
                mode="gauge+number",
                value=round(rate, 1),
                number={"suffix": "%", "font": {"size": 36, "color": clr}},
                gauge={
                    "axis":  {"range": [0, 100], "tickcolor": "#555"},
                    "bar":   {"color": clr},
                    "bgcolor": "#1a1a2e",
                    "steps": [
                        {"range": [0,  10],  "color": "#0d2b0d"},
                        {"range": [10, 30],  "color": "#2b1a0d"},
                        {"range": [30, 100], "color": "#2b0d0d"},
                    ],
                },
            ))
            fig_gauge.update_layout(
                height=260,
                margin=dict(l=20, r=20, t=20, b=20),
                paper_bgcolor="#0e1117",
                font_color="#ccc",
            )
            st.plotly_chart(fig_gauge, use_container_width=True)

    st.markdown("---")
    st.markdown("### 🕐 Latest Signals")

    if signals:
        df = pd.DataFrame(signals)

        # Confidence trend
        if "confidence" in df.columns and "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df = df.sort_values("timestamp")
            fig_trend = px.line(
                df,
                x="timestamp",
                y="confidence",
                color="label" if "label" in df.columns else None,
                color_discrete_map=COLORS,
                template="plotly_dark",
                markers=True,
            )
            fig_trend.update_traces(line_width=2, marker_size=6)
            fig_trend.update_layout(
                height=280,
                margin=dict(l=10, r=10, t=10, b=10),
                xaxis_title=None,
                yaxis_title="Confidence",
                yaxis_tickformat=".0%",
            )
            st.plotly_chart(fig_trend, use_container_width=True)

        # Styled table
        display_df = df.copy()
        if "confidence" in display_df.columns:
            display_df["confidence"] = display_df["confidence"].apply(lambda x: f"{float(x):.1%}")
        if "label" in display_df.columns:
            styled = display_df.style.applymap(color_label, subset=["label"])
            st.dataframe(styled, use_container_width=True, hide_index=True)
        else:
            st.dataframe(display_df, use_container_width=True, hide_index=True)
    else:
        st.info("⏳ No signals yet — waiting for data...")

    # Recent alerts
    if alerts:
        st.markdown("---")
        st.markdown("### 🚨 Recent Alerts")
        st.dataframe(pd.DataFrame(alerts[:5]), use_container_width=True, hide_index=True)

    # ── Auto-refresh countdown (بدل time.sleep مباشرة) ──────────
    if auto_refresh:
        placeholder = st.empty()
        for remaining in range(5, 0, -1):
            placeholder.caption(f"⏱️ Refreshing in {remaining}s...")
            time.sleep(1)
        placeholder.empty()
        get_all_data.clear()
        st.rerun()
