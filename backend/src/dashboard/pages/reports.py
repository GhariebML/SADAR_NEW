"""
reports.py
----------
Reports page for the RF Spectrum Anomaly Detection Dashboard.
"""
from __future__ import annotations

import streamlit as st
import requests
import os

from src.dashboard.data_provider import get_all_data

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000") + "/api/v1"

COLORS = {"Drone": "#ff4444", "Jamming": "#ff8800", "Normal": "#00c851"}
ICONS  = {"Drone": "🚁",      "Jamming": "⚠️",      "Normal": "✅"}


def _render_report(report: str, label: str, confidence: float) -> None:
    """
    ✅ يعرض التقرير بشكل احترافي مع دعم العربية RTL
    """
    color = COLORS.get(label, "#888")
    icon  = ICONS.get(label, "📡")

    # ── Header card ──────────────────────────────────────────────
    st.markdown(
        f"""
        <div style="background:{color}18;border:1px solid {color}66;
                    border-radius:10px;padding:18px 24px;margin-bottom:16px;
                    display:flex;align-items:center;gap:12px;">
            <span style="font-size:2rem;">{icon}</span>
            <div>
                <div style="color:{color};font-weight:700;font-size:1.2rem;">
                    {label} — {confidence:.0%} Confidence
                </div>
                <div style="color:#aaa;font-size:0.85rem;">SADAR Threat Analysis Report</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Report content with RTL support ──────────────────────────
    # نقسم التقرير لأجزاء — الجداول تفضل LTR والنص العربي RTL
    lines = report.split("\n")
    buffer = []
    in_table = False

    for line in lines:
        is_table_line = line.strip().startswith("|")

        if is_table_line and not in_table:
            # اعرض الـ buffer قبل الجدول
            if buffer:
                _flush_text_buffer(buffer)
                buffer = []
            in_table = True
            buffer.append(line)

        elif not is_table_line and in_table:
            # اعرض الجدول
            _flush_table_buffer(buffer)
            buffer = []
            in_table = False
            buffer.append(line)

        else:
            buffer.append(line)

    # اعرض الباقي
    if buffer:
        if in_table:
            _flush_table_buffer(buffer)
        else:
            _flush_text_buffer(buffer)


def _flush_text_buffer(lines: list[str]) -> None:
    """عرض نص عادي مع RTL للعربي"""
    text = "\n".join(lines)
    if not text.strip():
        return

    # ✅ RTL wrapper للنص العربي
    st.markdown(
        f"""
        <div style="
            direction: rtl;
            text-align: right;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 0.95rem;
            line-height: 1.9;
            color: #edf2f7;
            padding: 8px 0;
        ">
        {_md_to_html(text)}
        </div>
        """,
        unsafe_allow_html=True,
    )


def _flush_table_buffer(lines: list[str]) -> None:
    """عرض جدول بـ LTR"""
    text = "\n".join(lines)
    if not text.strip():
        return
    # الجداول تفضل LTR
    st.markdown(text)


def _md_to_html(text: str) -> str:
    """تحويل Markdown بسيط لـ HTML مع RTL"""
    import re
    html = text

    # Headers
    html = re.sub(r'^# (.+)$',   r'<h2 style="color:#00e5ff;border-bottom:1px solid #2a4a6a;padding-bottom:8px;margin:16px 0 8px;">\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$',  r'<h3 style="color:#00b4cc;margin:14px 0 6px;">\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h4 style="color:#a0c4d8;margin:10px 0 4px;">\1</h4>', html, flags=re.MULTILINE)

    # Bold
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong style="color:#edf2f7;">\1</strong>', html)

    # Bullet points
    html = re.sub(r'^[-*] (.+)$',
                  r'<div style="display:flex;gap:8px;margin:4px 0;"><span style="color:#00b4cc;">•</span><span>\1</span></div>',
                  html, flags=re.MULTILINE)

    # Numbered lists
    html = re.sub(r'^(\d+)\. (.+)$',
                  r'<div style="display:flex;gap:8px;margin:6px 0;"><span style="color:#00b4cc;font-weight:700;">\1.</span><span>\2</span></div>',
                  html, flags=re.MULTILINE)

    # Horizontal rule
    html = html.replace('---', '<hr style="border:none;border-top:1px solid #2a4a6a;margin:12px 0;">')

    # Paragraphs — أسطر فارغة = فاصل
    html = re.sub(r'\n\n+', '<br><br>', html)
    html = re.sub(r'\n', '<br>', html)

    return html


def show_reports():
    """Render the reports page."""
    st.caption("Generate AI-powered threat analysis reports.")

    st.markdown("### 🔍 Threat Analysis Report")

    with st.form("report_form"):
        col1, col2 = st.columns(2)
        with col1:
            label     = st.selectbox("Signal Label", ["Drone", "Jamming", "Normal"])
            frequency = st.number_input("Frequency (MHz)", min_value=0.0, value=433.5)
        with col2:
            confidence = st.slider("Confidence", 0.0, 1.0, 0.85)
            snr        = st.number_input("SNR (dB)", value=15.0)

        location      = st.text_input("Location", value="Cairo, Egypt")
        analyst_notes = st.text_area("Analyst Notes (optional)", height=80)
        submitted     = st.form_submit_button("🤖 Generate Report", type="primary")

    if submitted:
        with st.spinner("Generating AI threat analysis report..."):
            try:
                resp = requests.post(
                    f"{API_BASE_URL}/agent/report",
                    json={
                        "label":         label,
                        "confidence":    confidence,
                        "frequency_mhz": frequency,
                        "snr_db":        snr,
                        "location":      location,
                        "analyst_notes": analyst_notes,
                    },
                    timeout=250,
                )
                if resp.ok:
                    report = resp.json().get("markdown", str(resp.json()))
                    st.success("✅ Report Generated")
                    st.markdown("---")

                    # ✅ عرض التقرير مع RTL
                    _render_report(report, label, confidence)

                    st.markdown("---")
                    st.download_button(
                        "⬇️ Download Report",
                        report,
                        "sadar_report.md",
                        "text/markdown",
                    )
                else:
                    st.error(f"API error {resp.status_code}: {resp.text[:300]}")
            except requests.Timeout:
                st.error("⏱️ Request timed out — try again.")
            except requests.RequestException as exc:
                st.error(f"❌ Cannot reach AI Agent: {exc}")

    st.markdown("---")
    st.markdown("### 📊 Quick Statistics")

    data = get_all_data()

    if not data["api_ok"]:
        st.warning("⚠️ Cannot reach API — statistics unavailable")
    else:
        c1, c2, c3 = st.columns(3)
        c1.metric("📡 Total Signals", data["total_signals"])
        c2.metric("🚨 Total Alerts",  data["alert_count"])
        c3.metric("🎯 Threshold",     f"{data['threshold']:.0%}")

        if data["label_counts"]:
            st.markdown("#### 🏷️ Signal Breakdown")
            cols = st.columns(len(data["label_counts"]))
            for col, (lbl, count) in zip(cols, data["label_counts"].items()):
                icon  = ICONS.get(lbl, "📡")
                color = COLORS.get(lbl, "#888")
                total = sum(data["label_counts"].values()) or 1
                pct   = count / total * 100
                col.markdown(
                    f"""
                    <div style="background:{color}18;border:1px solid {color}66;
                                border-radius:10px;padding:16px;text-align:center;">
                        <div style="font-size:2rem;">{icon}</div>
                        <div style="font-size:1.8rem;font-weight:700;color:{color};">{count}</div>
                        <div style="color:#aaa;font-size:0.85rem;">{lbl}</div>
                        <div style="color:{color};font-size:0.8rem;margin-top:4px;">{pct:.1f}%</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
