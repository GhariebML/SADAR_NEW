"""
live_map.py - Live map with signal direction simulation + auto-refresh
"""
from __future__ import annotations

import time
import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

from src.dashboard.data_provider import get_all_data, get_predictions_filtered

COLORS = {"Drone": "#ff4444", "Jamming": "#ff8800", "Normal": "#00c851"}
SIZES  = {"Drone": 14, "Jamming": 16, "Normal": 8}

SDR_STATIONS = {
    "SIM-SDR-1": {"lat": 30.0444, "lon": 31.2357, "name": "Cairo Station"},
    "SIM-SDR-2": {"lat": 31.2001, "lon": 29.9187, "name": "Alexandria Station"},
    "SIM-SDR-3": {"lat": 30.0131, "lon": 31.2089, "name": "Giza Station"},
    "SDR-01":    {"lat": 30.0444, "lon": 31.2357, "name": "Main Station"},
    "SDR":       {"lat": 30.0444, "lon": 31.2357, "name": "Default Station"},
}

LOCATION_COORDS: dict[str, tuple[float, float]] = {
    "Cairo":           (30.0444,  31.2357),
    "Alexandria":      (31.2001,  29.9187),
    "Giza":            (30.0131,  31.2089),
    "Luxor":           (25.6872,  32.6396),
    "Aswan":           (24.0889,  32.8998),
    "Port Said":       (31.2565,  32.2841),
    "Suez":            (29.9668,  32.5498),
    "Sharm el-Sheikh": (27.9158,  34.3300),
    "Hurghada":        (27.2579,  33.8116),
    "Mansoura":        (31.0364,  31.3807),
    "Tanta":           (30.7865,  31.0004),
    "Ismailia":        (30.5965,  32.2715),
    "Unknown":         (26.8206,  30.8025),
}


def _get_coords(location: str) -> tuple[float, float]:
    for key, coords in LOCATION_COORDS.items():
        if key.lower() in location.lower():
            return coords
    return LOCATION_COORDS["Unknown"]


def _get_station(source: str) -> dict:
    for key, station in SDR_STATIONS.items():
        if key.lower() in source.lower():
            return station
    return SDR_STATIONS["SDR"]


def _simulate_signal_source(station_lat, station_lon, frequency_mhz, signal_id, label):
    rng      = np.random.default_rng(seed=int(signal_id) % 1000)
    angle    = (frequency_mhz * 7.3) % 360 if frequency_mhz else rng.uniform(0, 360)
    distance = rng.uniform(0.1, 0.5) if label == "Drone" else rng.uniform(0.3, 1.2)
    rad      = np.radians(angle)
    return station_lat + distance * np.cos(rad), station_lon + distance * np.sin(rad), angle


def _compass(angle: float) -> str:
    return ["N","NE","E","SE","S","SW","W","NW"][int((angle+22.5)//45) % 8]


def show_live_map():
    """Render the live map page with signal direction + auto-refresh."""
    st.caption("Geographic distribution and direction of detected spectrum anomalies.")

    # ── Controls ─────────────────────────────────────────────────
    col_title, col_toggle, col_refresh = st.columns([3, 1, 1])
    with col_toggle:
        auto_refresh = st.toggle("🔄 Auto (3s)", value=False)
    with col_refresh:
        if st.button("⟳ Refresh Now", use_container_width=True):
            get_all_data.clear()
            get_predictions_filtered.clear()
            st.rerun()

    # ── Data — آخر 50 إشارة (الأحدث) ────────────────────────────
    data    = get_all_data()
    signals = get_predictions_filtered(limit=50)   # ✅ آخر 50 مش أول 200
    alerts  = data["alerts"]

    if not data["api_ok"]:
        st.warning("⚠️ Cannot reach API — showing cached data")

    anomalies = [s for s in signals if s.get("label") != "Normal"]

    # ── KPIs ─────────────────────────────────────────────────────
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("🚨 Total Alerts",  data["alert_count"])   # ✅ من statistics مش len(alerts)
    c2.metric("📡 Total Signals", data["total_signals"])
    c3.metric("⚠️ Anomalies",     len(anomalies))
    c4.metric("✅ Normal",         len(signals) - len(anomalies))

    st.markdown("---")

    # ════════════════════════════════════════════════════════════
    # 🗺️ LIVE SIGNAL DIRECTION MAP
    # ════════════════════════════════════════════════════════════
    if signals:
        df_sig       = pd.DataFrame(signals)
        anomaly_sigs = df_sig[df_sig["label"] != "Normal"].tail(30)

        st.markdown("### 🗺️ Live Signal Direction Map")
        st.caption("🔵 محطات الاستقبال SDR  |  الخطوط = اتجاه الإشارة  |  النقاط = مصدر التهديد")

        fig = go.Figure()

        if not anomaly_sigs.empty:
            stations_added = set()

            for _, row in anomaly_sigs.iterrows():
                source     = str(row.get("source", "SDR"))
                station    = _get_station(source)
                signal_id  = row.get("id", 1)
                label      = row.get("label", "Normal")
                # ✅ بيجيب frequency_mhz (اللي اتعمله normalize في data_provider)
                freq       = row.get("frequency_mhz") or row.get("frequency")
                confidence = float(row.get("confidence", 0.5))
                color      = COLORS.get(label, "#ffffff")
                size       = SIZES.get(label, 10)

                src_lat, src_lon, angle = _simulate_signal_source(
                    station["lat"], station["lon"], freq, signal_id, label
                )

                # محطة الاستقبال
                stn_key = station["name"]
                if stn_key not in stations_added:
                    fig.add_trace(go.Scattermapbox(
                        lat=[station["lat"]], lon=[station["lon"]],
                        mode="markers+text",
                        marker=dict(size=20, color="#00e5ff"),
                        text=[f"📡 {station['name']}"],
                        textposition="top right",
                        name=stn_key,
                        hoverinfo="text",
                        hovertext=f"<b>SDR Station</b><br>{station['name']}",
                    ))
                    stations_added.add(stn_key)

                # خط اتجاه الإشارة
                fig.add_trace(go.Scattermapbox(
                    lat=[src_lat, station["lat"]],
                    lon=[src_lon, station["lon"]],
                    mode="lines",
                    line=dict(width=max(1, int(confidence * 4)), color=color),
                    opacity=max(0.3, confidence),
                    showlegend=False,
                    hoverinfo="skip",
                ))

                # نقطة مصدر الإشارة
                fig.add_trace(go.Scattermapbox(
                    lat=[src_lat], lon=[src_lon],
                    mode="markers",
                    marker=dict(size=size + 4, color=color, opacity=0.9),
                    showlegend=False,
                    hovertext=(
                        f"<b>🚨 {label}</b><br>"
                        f"Confidence: <b>{confidence:.1%}</b><br>"
                        f"Frequency: {f'{freq:.2f}' if freq else 'N/A'} MHz<br>"
                        f"Source: {source}<br>"
                        f"Direction: {angle:.0f}° ({_compass(angle)})<br>"
                        f"Station: {station['name']}"
                    ),
                    hoverinfo="text",
                ))

            # Legend
            for lbl, clr in COLORS.items():
                if lbl != "Normal":
                    fig.add_trace(go.Scattermapbox(
                        lat=[None], lon=[None], mode="markers",
                        marker=dict(size=10, color=clr),
                        name=lbl, showlegend=True,
                    ))
        else:
            for stn in SDR_STATIONS.values():
                fig.add_trace(go.Scattermapbox(
                    lat=[stn["lat"]], lon=[stn["lon"]],
                    mode="markers+text",
                    marker=dict(size=16, color="#00e5ff"),
                    text=[f"📡 {stn['name']}"],
                    textposition="top right",
                    name=stn["name"],
                ))

        fig.update_layout(
            mapbox=dict(
                style="open-street-map",
                center=dict(lat=29.5, lon=31.0),
                zoom=6,
            ),
            margin=dict(l=0, r=0, t=0, b=0),
            height=520,
            paper_bgcolor="rgba(0,0,0,0)",
            legend=dict(
                bgcolor="rgba(10,20,40,0.85)",
                font=dict(color="white", size=13),
                bordercolor="#00e5ff",
                borderwidth=1,
                x=0.01, y=0.99,
            ),
        )
        st.plotly_chart(fig, use_container_width=True)

        # ── جدول الإشارات ─────────────────────────────────────────
        if not anomaly_sigs.empty:
            st.markdown("#### 📊 Signal Details with Direction")
            rows = []
            for _, row in anomaly_sigs.iterrows():
                source  = str(row.get("source", "SDR"))
                station = _get_station(source)
                freq    = row.get("frequency_mhz") or row.get("frequency")
                conf    = float(row.get("confidence", 0))
                _, _, angle = _simulate_signal_source(
                    station["lat"], station["lon"],
                    freq, row.get("id", 1), row.get("label")
                )
                rows.append({
                    "🏷️ Label":      row.get("label"),
                    "🎯 Confidence": f"{conf:.1%}",
                    "📻 Freq (MHz)": f"{freq:.2f}" if freq else "N/A",
                    "📡 Station":    station["name"],
                    "🧭 Direction":  f"{angle:.0f}° ({_compass(angle)})",
                    "💪 Strength":   "🔴 Strong" if conf > 0.8 else "🟠 Medium" if conf > 0.5 else "🟡 Weak",
                    "🕐 Time":       str(row.get("timestamp", ""))[:19],
                })
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # ── Alerts ────────────────────────────────────────────────────
    if alerts:
        st.markdown("---")
        st.markdown("### 🚨 Alert Locations")
        df_alerts = pd.DataFrame(alerts)
        if "location" in df_alerts.columns:
            df_alerts[["lat", "lon"]] = df_alerts["location"].apply(
                lambda loc: pd.Series(_get_coords(str(loc)))
            )
            rng = np.random.default_rng(seed=42)
            df_alerts["lat"] += rng.uniform(-0.05, 0.05, len(df_alerts))
            df_alerts["lon"] += rng.uniform(-0.05, 0.05, len(df_alerts))
            fig_alt = px.scatter_mapbox(
                df_alerts, lat="lat", lon="lon",
                color="alert_type" if "alert_type" in df_alerts.columns else "location",
                color_discrete_map=COLORS,
                hover_data={c: True for c in ["location","alert_type","status","timestamp"] if c in df_alerts.columns},
                zoom=5, center={"lat": 26.8, "lon": 30.8}, height=350,
            )
            fig_alt.update_layout(mapbox_style="open-street-map", margin=dict(l=0,r=0,t=0,b=0))
            st.plotly_chart(fig_alt, use_container_width=True)

    # ── Signal charts ─────────────────────────────────────────────
    if signals:
        df_signals = pd.DataFrame(signals)
        st.markdown("---")
        col1, col2 = st.columns(2)
        with col1:
            if "source" in df_signals.columns:
                st.markdown("### 📡 Signal Sources")
                src = df_signals["source"].value_counts().reset_index()
                src.columns = ["Source", "Count"]
                fig_src = px.bar(src, x="Source", y="Count", template="plotly_dark",
                                 text="Count", color="Count",
                                 color_continuous_scale=["#1a3a5a","#00aaff"])
                fig_src.update_layout(height=280, margin=dict(l=10,r=10,t=10,b=10))
                st.plotly_chart(fig_src, use_container_width=True)
        with col2:
            if "label" in df_signals.columns:
                st.markdown("### 🏷️ Label Distribution")
                lbl = df_signals["label"].value_counts().reset_index()
                lbl.columns = ["Label", "Count"]
                fig_lbl = px.pie(lbl, values="Count", names="Label",
                                 color="Label", color_discrete_map=COLORS,
                                 template="plotly_dark", hole=0.45)
                fig_lbl.update_layout(height=280, margin=dict(l=10,r=10,t=10,b=10))
                st.plotly_chart(fig_lbl, use_container_width=True)

    # ── Auto-refresh ─────────────────────────────────────────────
    if auto_refresh:
        placeholder = st.empty()
        for remaining in range(3, 0, -1):
            placeholder.caption(f"⏱️ Map refreshing in {remaining}s...")
            time.sleep(1)
        placeholder.empty()
        get_all_data.clear()
        get_predictions_filtered.clear()
        st.rerun()