"""
history.py
----------
Prediction history page for the RF Spectrum Anomaly Detection Dashboard.
"""
from __future__ import annotations

import streamlit as st
import pandas as pd

from src.dashboard.data_provider import get_predictions_filtered, get_all_data

LABEL_COLORS = {
    "Drone":   "background-color: #ff444433; color: #ff4444;",
    "Jamming": "background-color: #ff880033; color: #ff8800;",
    "Normal":  "background-color: #00c85133; color: #00c851;",
}


def color_label(val):
    return LABEL_COLORS.get(val, "")


def show_history():
    """Render the prediction history page."""
    st.caption("Browse and filter all past signal predictions.")

    col1, col2 = st.columns(2)
    with col1:
        label_filter = st.selectbox("Filter by Label", ["All", "Normal", "Jamming", "Drone"])
    with col2:
        limit = st.slider("Max Records", 10, 1000, 200)

    data    = get_all_data()
    signals = get_predictions_filtered(limit=limit, label=label_filter)

    if not data["api_ok"]:
        st.warning("⚠️ Cannot reach API — showing cached data")

    if not signals:
        st.info("⏳ No predictions found yet.")
        return

    st.caption(f"Showing {len(signals)} records")

    df = pd.DataFrame(signals)

    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp", ascending=False)

    # ✅ confidence كـ %
    if "confidence" in df.columns:
        df["confidence"] = df["confidence"].apply(lambda x: f"{float(x):.1%}")

    search = st.text_input("🔍 Search by source, label, or location")
    if search:
        mask = df.apply(
            lambda row: row.astype(str).str.contains(search, case=False).any(), axis=1
        )
        df = df[mask]

    # ✅ ألوان على الـ label column
    if "label" in df.columns:
        styled = df.style.applymap(color_label, subset=["label"])
        st.dataframe(styled, use_container_width=True, hide_index=True)
    else:
        st.dataframe(df, use_container_width=True, hide_index=True)

    csv = df.to_csv(index=False)
    st.download_button("⬇️ Download CSV", csv, "predictions.csv", "text/csv")
