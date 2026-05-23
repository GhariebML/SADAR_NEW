"""
analytics.py
------------
Analytics page for the RF Spectrum Anomaly Detection Dashboard.
"""
from __future__ import annotations

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from src.dashboard.data_provider import get_all_data, get_predictions_filtered

# ✅ ألوان ثابتة لكل label
COLORS = {"Drone": "#ff4444", "Jamming": "#ff8800", "Normal": "#00c851"}


def show_analytics():
    """Render the analytics page."""
    st.caption("Signal statistics, label distribution, and anomaly trends.")

    data    = get_all_data()
    signals = get_predictions_filtered(limit=500)

    if not data["api_ok"]:
        st.warning("⚠️ Cannot reach API — showing cached data")

    label_counts  = data["label_counts"]
    total_signals = data["total_signals"]
    total_alerts  = data["alert_count"]
    threshold     = data["threshold"]
    anomalies     = sum(v for k, v in label_counts.items() if k != "Normal")

    # ✅ Metrics
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("📡 Total Signals",   total_signals)
    c2.metric("🚨 Total Alerts",    total_alerts)
    c3.metric("⚠️ Anomalies",       anomalies)
    c4.metric("🎯 Alert Threshold", f"{threshold:.0%}")

    st.markdown("---")

    if label_counts:
        st.markdown("### 📊 Label Distribution")
        col1, col2 = st.columns(2)

        labels = list(label_counts.keys())
        counts = list(label_counts.values())
        colors = [COLORS.get(l, "#888888") for l in labels]

        # ✅ Bar chart ملون
        with col1:
            fig_bar = go.Figure(go.Bar(
                x=labels,
                y=counts,
                marker_color=colors,
                text=counts,
                textposition="auto",
            ))
            fig_bar.update_layout(
                template="plotly_dark",
                height=300,
                margin=dict(l=10, r=10, t=10, b=10),
                showlegend=False,
            )
            st.plotly_chart(fig_bar, use_container_width=True)

        # ✅ Pie chart ملون
        with col2:
            fig_pie = px.pie(
                values=counts,
                names=labels,
                color=labels,
                color_discrete_map=COLORS,
                hole=0.4,
            )
            fig_pie.update_layout(
                template="plotly_dark",
                height=300,
                margin=dict(l=10, r=10, t=10, b=10),
            )
            st.plotly_chart(fig_pie, use_container_width=True)

    if signals:
        df = pd.DataFrame(signals)

        # ✅ Confidence Over Time
        if "confidence" in df.columns and "timestamp" in df.columns:
            st.markdown("---")
            st.markdown("### 📈 Confidence Over Time")
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df = df.sort_values("timestamp")

            if "label" in df.columns:
                fig_line = px.line(
                    df,
                    x="timestamp",
                    y="confidence",
                    color="label",
                    color_discrete_map=COLORS,
                    template="plotly_dark",
                )
                fig_line.update_traces(line_width=2)
                fig_line.update_layout(height=350, margin=dict(l=10, r=10, t=10, b=10))
                st.plotly_chart(fig_line, use_container_width=True)
            else:
                fig_line = px.line(df, x="timestamp", y="confidence", template="plotly_dark")
                st.plotly_chart(fig_line, use_container_width=True)

        # ✅ Signal Sources ملون
        if "source" in df.columns and "label" in df.columns:
            st.markdown("---")
            st.markdown("### 📡 Signal Sources")
            source_label = df.groupby(["source", "label"]).size().reset_index(name="count")
            fig_src = px.bar(
                source_label,
                x="source",
                y="count",
                color="label",
                color_discrete_map=COLORS,
                template="plotly_dark",
                barmode="stack",
                text="count",
            )
            fig_src.update_layout(height=350, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig_src, use_container_width=True)

        # ✅ Recent Signals مع confidence كـ %
        st.markdown("---")
        st.markdown("### 🗂️ Recent Signals")
        display_df = df.tail(50).copy()
        if "confidence" in display_df.columns:
            display_df["confidence"] = display_df["confidence"].apply(lambda x: f"{x:.1%}")
        st.dataframe(display_df, use_container_width=True, hide_index=True)

        csv = df.to_csv(index=False)
        st.download_button("⬇️ Download CSV", csv, "signals.csv", "text/csv")
    else:
        st.info("⏳ No signal data yet.")
