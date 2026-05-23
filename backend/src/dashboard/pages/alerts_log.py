"""
alerts_log.py
-------------
Alerts log page for the RF Spectrum Anomaly Detection Dashboard.
"""
from __future__ import annotations

import streamlit as st
import pandas as pd
import plotly.express as px

from src.dashboard.data_provider import get_all_data

COLORS = {"Drone": "#ff4444", "Jamming": "#ff8800", "Normal": "#00c851"}
LABEL_STYLE = {
    "Drone":   "background-color:#ff444433;color:#ff4444;font-weight:600;",
    "Jamming": "background-color:#ff880033;color:#ff8800;font-weight:600;",
    "Normal":  "background-color:#00c85133;color:#00c851;font-weight:600;",
}
STATUS_STYLE = {
    "active":   "background-color:#ff444433;color:#ff4444;",
    "resolved": "background-color:#00c85133;color:#00c851;",
    "pending":  "background-color:#ff880033;color:#ff8800;",
}
SEVERITY_MAP = {"Drone": "🔴 High", "Jamming": "🟠 Medium", "Normal": "🟢 Low"}


def color_alert_type(val):
    return LABEL_STYLE.get(val, "")


def color_status(val):
    return STATUS_STYLE.get(str(val).lower(), "")


def show_alerts_log():
    """Render the alerts log page."""
    st.caption("All triggered anomaly alerts with location, severity, and status.")

    col_r, col_b = st.columns([5, 1])
    with col_b:
        if st.button("⟳ Refresh", use_container_width=True):
            get_all_data.clear()
            st.rerun()

    data   = get_all_data()
    alerts = data["alerts"]

    if not data["api_ok"]:
        st.warning("⚠️ Cannot reach API — showing cached data")

    if not alerts:
        st.success("🟢 No alerts — system is clean!")
        return

    df = pd.DataFrame(alerts)

    # ── Add severity column ──────────────────────────────────────
    if "alert_type" in df.columns:
        df["severity"] = df["alert_type"].map(SEVERITY_MAP).fillna("⚪ Unknown")

    # ── KPIs ────────────────────────────────────────────────────
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("🚨 Total Alerts", len(df))
    c2.metric("🔴 High",
              len(df[df["severity"].str.startswith("🔴")]) if "severity" in df.columns else 0)
    c3.metric("🟠 Medium",
              len(df[df["severity"].str.startswith("🟠")]) if "severity" in df.columns else 0)
    c4.metric("📍 Locations",
              df["location"].nunique() if "location" in df.columns else 0)

    st.markdown("---")

    # ── Filters ─────────────────────────────────────────────────
    fcol1, fcol2, fcol3 = st.columns(3)
    with fcol1:
        types = ["All"] + sorted(df["alert_type"].unique().tolist()) if "alert_type" in df.columns else ["All"]
        filter_type = st.selectbox("Filter by Type", types)
    with fcol2:
        locs = ["All"] + sorted(df["location"].unique().tolist()) if "location" in df.columns else ["All"]
        filter_loc = st.selectbox("Filter by Location", locs)
    with fcol3:
        search = st.text_input("🔍 Search", placeholder="keyword...")

    fdf = df.copy()
    if filter_type != "All" and "alert_type" in fdf.columns:
        fdf = fdf[fdf["alert_type"] == filter_type]
    if filter_loc != "All" and "location" in fdf.columns:
        fdf = fdf[fdf["location"] == filter_loc]
    if search:
        mask = fdf.apply(lambda row: row.astype(str).str.contains(search, case=False).any(), axis=1)
        fdf = fdf[mask]

    st.caption(f"Showing {len(fdf)} of {len(df)} alerts")

    # ── Styled table ─────────────────────────────────────────────
    style_cols = {}
    if "alert_type" in fdf.columns:
        style_cols["alert_type"] = color_alert_type
    if "status" in fdf.columns:
        style_cols["status"] = color_status

    if style_cols:
        styled = fdf.style
        for col, fn in style_cols.items():
            styled = styled.applymap(fn, subset=[col])
        st.dataframe(styled, use_container_width=True, hide_index=True)
    else:
        st.dataframe(fdf, use_container_width=True, hide_index=True)

    csv = fdf.to_csv(index=False)
    st.download_button("⬇️ Download CSV", csv, "alerts.csv", "text/csv")

    st.markdown("---")

    # ── Charts ───────────────────────────────────────────────────
    col1, col2 = st.columns(2)

    with col1:
        if "alert_type" in df.columns:
            st.markdown("### 📊 Alert Distribution")
            counts = df["alert_type"].value_counts().reset_index()
            counts.columns = ["Type", "Count"]
            fig = px.bar(
                counts, x="Type", y="Count",
                color="Type", color_discrete_map=COLORS,
                template="plotly_dark", text="Count",
            )
            fig.update_layout(height=280, margin=dict(l=10, r=10, t=10, b=10), showlegend=False)
            st.plotly_chart(fig, use_container_width=True)

    with col2:
        if "location" in df.columns:
            st.markdown("### 📍 Top Locations")
            locs = df["location"].value_counts().head(8).reset_index()
            locs.columns = ["Location", "Count"]
            fig2 = px.bar(
                locs, x="Count", y="Location",
                orientation="h",
                template="plotly_dark", text="Count",
                color="Count",
                color_continuous_scale=["#ff880055", "#ff4444"],
            )
            fig2.update_layout(height=280, margin=dict(l=10, r=10, t=10, b=10), showlegend=False)
            st.plotly_chart(fig2, use_container_width=True)

    # Timeline
    if "timestamp" in df.columns:
        st.markdown("### 📅 Alert Timeline")
        df_t = df.copy()
        df_t["timestamp"] = pd.to_datetime(df_t["timestamp"])
        df_t = df_t.sort_values("timestamp")
        df_t["date"] = df_t["timestamp"].dt.date
        timeline = df_t.groupby(["date", "alert_type"]).size().reset_index(name="count") \
            if "alert_type" in df_t.columns \
            else df_t.groupby("date").size().reset_index(name="count")

        if "alert_type" in timeline.columns:
            fig_tl = px.bar(
                timeline, x="date", y="count",
                color="alert_type", color_discrete_map=COLORS,
                template="plotly_dark", text="count", barmode="stack",
            )
        else:
            fig_tl = px.bar(timeline, x="date", y="count", template="plotly_dark")

        fig_tl.update_layout(height=280, margin=dict(l=10, r=10, t=10, b=10))
        st.plotly_chart(fig_tl, use_container_width=True)
