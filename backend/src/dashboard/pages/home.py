"""
home.py
-------
Home page for the RF Spectrum Anomaly Detection Dashboard.
"""
from __future__ import annotations

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from src.dashboard.data_provider import get_all_data

COLORS = {"Drone": "#ff4444", "Jamming": "#ff8800", "Normal": "#00c851"}
ICONS  = {"Drone": "🚁", "Jamming": "⚠️", "Normal": "✅"}


def show_home():
    """Render the home page."""

    # ── Fetch data ───────────────────────────────────────────────
    data = get_all_data(limit=5)

    api_ok        = data["api_ok"]
    total_signals = data["total_signals"]
    total_alerts  = data["alert_count"]
    label_counts  = data["label_counts"]
    alerts        = data["alerts"]
    signals       = data["signals"]
    threshold     = data["threshold"]
    anomalies     = sum(v for k, v in label_counts.items() if k != "Normal")
    normal_count  = label_counts.get("Normal", 0)
    total_lbl     = sum(label_counts.values()) or 1
    health_pct    = round(normal_count / total_lbl * 100, 1)

    # ── API status banner ────────────────────────────────────────
    if api_ok:
        st.success("🟢 **SADAR System Online** — All components operational", icon=None)
    else:
        st.error("🔴 **API Offline** — Running on cached data", icon=None)

    # ── KPI row ──────────────────────────────────────────────────
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("📡 Signals",      total_signals)
    c2.metric("🚨 Alerts",       total_alerts)
    c3.metric("⚠️ Anomalies",    anomalies)
    c4.metric("🎯 Threshold",    f"{threshold:.0%}")
    c5.metric("💚 System Health", f"{health_pct}%",
              delta=f"{'↑ Stable' if health_pct > 70 else '↓ Check'}")

    st.markdown("---")

    # ── Quick Actions ────────────────────────────────────────────
    st.markdown("### ⚡ Quick Actions")
    col1, col2, col3, col4 = st.columns(4)
    actions = [
        ("📡 Start Monitoring", "📡 Real-time Monitor"),
        ("📜 View History",     "📜 History"),
        ("🤖 AI Agent",         "🤖 AI Agent"),
        ("🔔 Alerts Log",       "🔔 Alerts Log"),
    ]
    for col, (label, page) in zip([col1, col2, col3, col4], actions):
        with col:
            if st.button(label, use_container_width=True):
                st.session_state.current_page = page
                st.rerun()

    st.markdown("---")

    # ── Label cards ──────────────────────────────────────────────
    if label_counts:
        st.markdown("### 🏷️ Signal Breakdown")
        card_cols = st.columns(len(label_counts))
        for col, (lbl, cnt) in zip(card_cols, label_counts.items()):
            icon  = ICONS.get(lbl, "📡")
            color = COLORS.get(lbl, "#888")
            pct   = cnt / total_lbl * 100
            col.markdown(
                f"""
                <div style="background:{color}18;border:1px solid {color}66;border-radius:10px;
                            padding:18px;text-align:center;">
                    <div style="font-size:2rem;">{icon}</div>
                    <div style="font-size:1.8rem;font-weight:700;color:{color};">{cnt}</div>
                    <div style="color:#aaa;font-size:0.85rem;">{lbl}</div>
                    <div style="color:{color};font-size:0.8rem;margin-top:4px;">{pct:.1f}%</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    st.markdown("---")

    # ── Recent signals + alerts columns ──────────────────────────
    col_sig, col_alt = st.columns(2)

    with col_sig:
        st.markdown("### 📡 Recent Signals")
        if signals:
            for s in signals[:5]:
                label      = s.get("label", "Unknown")
                confidence = s.get("confidence", 0)
                ts         = s.get("timestamp", "")[:19]
                color      = COLORS.get(label, "#888")
                st.markdown(
                    f"<div style='display:flex;justify-content:space-between;align-items:center;"
                    f"padding:8px 4px;border-bottom:1px solid #222;'>"
                    f"<span style='color:{color};font-weight:600;font-size:0.9rem;'>"
                    f"{ICONS.get(label,'📡')} {label}</span>"
                    f"<span style='color:#ddd;font-size:0.9rem;'>{float(confidence):.1%}</span>"
                    f"<span style='color:#555;font-size:0.75rem;'>{ts}</span></div>",
                    unsafe_allow_html=True,
                )
        else:
            st.info("No signals yet")

    with col_alt:
        st.markdown("### 🚨 Recent Alerts")
        if alerts:
            for a in alerts[:5]:
                alert_type = a.get("alert_type", "Unknown")
                location   = a.get("location", "Unknown")
                ts         = a.get("timestamp", "")[:19]
                color      = COLORS.get(alert_type, "#ff4444")
                st.markdown(
                    f"<div style='display:flex;justify-content:space-between;align-items:center;"
                    f"padding:8px 4px;border-bottom:1px solid #222;'>"
                    f"<span style='color:{color};font-weight:600;font-size:0.9rem;'>🚨 {alert_type}</span>"
                    f"<span style='color:#aaa;font-size:0.8rem;'>📍 {location}</span>"
                    f"<span style='color:#555;font-size:0.75rem;'>{ts}</span></div>",
                    unsafe_allow_html=True,
                )
        else:
            st.info("🟢 No alerts — system clean")

    st.markdown("---")

    # ── Label donut + system components ──────────────────────────
    col_chart, col_sys = st.columns([1, 1])

    with col_chart:
        if label_counts:
            st.markdown("### 📊 Label Distribution")
            fig = px.pie(
                values=list(label_counts.values()),
                names=list(label_counts.keys()),
                color=list(label_counts.keys()),
                color_discrete_map=COLORS,
                hole=0.5,
                template="plotly_dark",
            )
            fig.update_traces(textposition="outside", textinfo="percent+label")
            fig.update_layout(
                height=280, margin=dict(l=10, r=10, t=10, b=10), showlegend=False
            )
            st.plotly_chart(fig, use_container_width=True)

    with col_sys:
        st.markdown("### 🖥️ System Components")
        components = [
            ("🤖 AI Model",   "EfficientNet-B0",    "93.47% Accuracy", "#00c851"),
            ("🧠 AI Agent",   "RAG + Ollama",        "Arabic / English", "#00aaff"),
            ("📡 Hardware",   "RTL-SDR Compatible",  "2.4 / 5.8 GHz",   "#ff8800"),
            ("🏆 Competition","ITC-EGYPT 2026",       "SADAR v1.0.0",    "#9966ff"),
        ]
        for icon_name, subtitle, detail, color in components:
            st.markdown(
                f"""<div style="background:{color}18;border-left:3px solid {color};
                                border-radius:6px;padding:10px 14px;margin-bottom:8px;">
                        <span style="font-weight:700;color:{color};">{icon_name}</span>
                        <span style="color:#ccc;margin-left:8px;">{subtitle}</span>
                        <span style="color:#666;font-size:0.8rem;margin-left:8px;">• {detail}</span>
                    </div>""",
                unsafe_allow_html=True,
            )
