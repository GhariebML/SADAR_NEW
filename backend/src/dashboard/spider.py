"""
spider.py
---------
Central layout manager for the SADAR Spectrum Anomaly Detection Dashboard.
Professional sidebar with Dark/Light theme support.
Author: Goda Emad (Team Leader & AI Lead)
"""

from __future__ import annotations
import streamlit as st
from datetime import datetime
import os
import requests

from src.dashboard.pages.home           import show_home
from src.dashboard.pages.realtime       import show_realtime
from src.dashboard.pages.history        import show_history
from src.dashboard.pages.alerts_log     import show_alerts_log
from src.dashboard.pages.analytics      import show_analytics
from src.dashboard.pages.reports        import show_reports
from src.dashboard.pages.live_map       import show_live_map
from src.dashboard.pages.agent_chat     import show_agent_chat
from src.dashboard.pages.system_monitor import show_system_monitor

API_BASE_URL = os.getenv("API_BASE_URL", "http://api:8000") + "/api/v1"

PAGES = {
    "home":           {"label": "Home",             "icon": "🏠",  "function": show_home},
    "realtime":       {"label": "Real-time Monitor", "icon": "📡",  "function": show_realtime},
    "history":        {"label": "History",           "icon": "📜",  "function": show_history},
    "alerts_log":     {"label": "Alerts Log",        "icon": "🔔",  "function": show_alerts_log},
    "analytics":      {"label": "Analytics",         "icon": "📊",  "function": show_analytics},
    "reports":        {"label": "Reports",           "icon": "📄",  "function": show_reports},
    "live_map":       {"label": "Live Map",          "icon": "🗺️",  "function": show_live_map},
    "agent_chat":     {"label": "AI Agent",          "icon": "🤖",  "function": show_agent_chat},
    "system_monitor": {"label": "System Monitor",    "icon": "🖥️",  "function": show_system_monitor},
}

st.set_page_config(
    page_title="SADAR | Spectrum Anomaly Detection",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        "Get Help": "https://github.com/Goda-Emad/ITC-Egypt-2026-Spectrum-Anomaly-Detection",
        "About": "# SADAR\nAI-Powered RF Spectrum Monitoring | ITC-EGYPT 2026",
    },
)

if "page"  not in st.session_state: st.session_state.page  = "home"
if "theme" not in st.session_state: st.session_state.theme = "dark"


def _colors():
    if st.session_state.theme == "dark":
        return {
            "NAV_BG":      "#040810",
            "MAIN_BG":     "#080f1e",
            "WHITE":       "#edf2f7",
            "GREY":        "#a0aec0",
            "BORDER":      "#2a2f3a",
            "TEAL":        "#00e5ff",
            "RED":         "#ef4444",
            "ORANGE":      "#f59e0b",
            "TEXT":        "#edf2f7",
            "SUBTEXT":     "#718096",
            "CARD_BG":     "#0c1628",
            "BTN_COLOR":   "#040810",
        }
    else:
        return {
            "NAV_BG":      "#1a2332",
            "MAIN_BG":     "#f0f4f8",
            "WHITE":       "#1a202c",
            "GREY":        "#4a5568",
            "BORDER":      "#cbd5e0",
            "TEAL":        "#0088aa",
            "RED":         "#c53030",
            "ORANGE":      "#c05621",
            "TEXT":        "#1a202c",
            "SUBTEXT":     "#4a5568",
            "CARD_BG":     "#ffffff",
            "BTN_COLOR":   "#ffffff",
        }


def _load_css_files():
    css_files = [
        "src/dashboard/assets/style.css",
        "src/dashboard/assets/theme.css",
        "src/dashboard/assets/typography.css",
        "src/dashboard/assets/components.css",
        "src/dashboard/assets/animations.css",
        "src/dashboard/assets/responsive.css",
    ]
    combined = ""
    for f in css_files:
        if os.path.exists(f):
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    combined += fh.read() + "\n"
            except Exception:
                pass
    if combined:
        st.markdown("<style>" + combined + "</style>", unsafe_allow_html=True)


def _inject_theme():
    c = _colors()

    # ✅ Pre-compute all values BEFORE the CSS string - no nested f-strings
    nav_bg    = c["NAV_BG"]
    main_bg   = c["MAIN_BG"]
    text      = c["TEXT"]
    white     = c["WHITE"]
    grey      = c["GREY"]
    border    = c["BORDER"]
    teal      = c["TEAL"]
    subtext   = c["SUBTEXT"]
    card_bg   = c["CARD_BG"]
    btn_color = c["BTN_COLOR"]
    teal22    = teal + "22"
    teal44    = teal + "44"

    css = """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    .stApp, [data-testid="stAppViewContainer"] {
        background-color: """ + main_bg + """ !important;
        color: """ + text + """ !important;
    }

    .stApp p, .stApp span, .stApp div, .stApp label,
    .stApp h1, .stApp h2, .stApp h3, .stApp h4 {
        color: """ + text + """ !important;
    }

    [data-testid="stSidebar"],
    section[data-testid="stSidebar"] {
        background-color: """ + nav_bg + """ !important;
        border-right: 1px solid """ + border + """ !important;
    }
    [data-testid="stSidebar"] div,
    [data-testid="stSidebar"] span,
    [data-testid="stSidebar"] p,
    [data-testid="stSidebar"] label {
        color: """ + white + """ !important;
        font-family: 'IBM Plex Sans', sans-serif !important;
    }
    [data-testid="stSidebarNav"] { display: none !important; }

    [data-testid="stSidebar"] .stButton > button {
        background: transparent !important;
        border: 1px solid transparent !important;
        color: """ + grey + """ !important;
        border-radius: 8px !important;
        width: 100% !important;
        font-size: .84rem !important;
        font-weight: 500 !important;
        padding: 9px 12px !important;
        margin-bottom: 2px !important;
        transition: all .18s !important;
        text-align: left !important;
    }
    [data-testid="stSidebar"] .stButton > button:hover {
        background: """ + teal22 + """ !important;
        color: """ + teal + """ !important;
        border-color: """ + teal44 + """ !important;
    }

    [data-testid="metric-container"] {
        background: """ + card_bg + """ !important;
        border: 1px solid """ + border + """ !important;
        border-radius: 12px !important;
        padding: 16px !important;
    }
    [data-testid="stMetricValue"] {
        color: """ + teal + """ !important;
        font-weight: 700 !important;
        font-family: 'JetBrains Mono', monospace !important;
    }
    [data-testid="stMetricLabel"] {
        color: """ + subtext + """ !important;
        font-size: 11px !important;
        text-transform: uppercase !important;
        letter-spacing: .1em !important;
    }

    .main .stButton > button {
        background: """ + teal + """ !important;
        color: """ + btn_color + """ !important;
        border: 1px solid """ + teal + """ !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        padding: 8px 20px !important;
        transition: all .18s !important;
    }
    .main .stButton > button:hover {
        background: transparent !important;
        color: """ + teal + """ !important;
    }

    [data-testid="stDataFrame"] {
        background: """ + card_bg + """ !important;
        border: 1px solid """ + border + """ !important;
        border-radius: 8px !important;
    }

    [data-testid="stTextInput"] input,
    [data-testid="stTextArea"] textarea,
    [data-testid="stSelectbox"] > div > div {
        background: """ + card_bg + """ !important;
        color: """ + text + """ !important;
        border: 1px solid """ + border + """ !important;
        border-radius: 8px !important;
    }

    hr { border-color: """ + border + """ !important; }

    [data-testid="stAlert"] {
        border-radius: 8px !important;
        border: 1px solid """ + border + """ !important;
    }
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)


def render_sidebar():
    c = _colors()

    with st.sidebar:
        st.markdown(
            '<div style="display:flex;align-items:center;gap:10px;padding:16px 4px 14px;">'
            '<div style="font-size:2.2rem;">🛡️</div>'
            '<div>'
            '<div style="font-size:.88rem;font-weight:700;color:' + c["WHITE"] + ';">SADAR</div>'
            '<div style="font-size:.58rem;color:' + c["TEAL"] + ';font-weight:600;'
            'letter-spacing:1.2px;text-transform:uppercase;">SPECTRUM ANOMALY DETECTION</div>'
            '</div></div>',
            unsafe_allow_html=True)

        st.markdown('<div style="height:1px;background:' + c["BORDER"] + ';margin-bottom:10px;"></div>',
                    unsafe_allow_html=True)

        thm_lbl = "☀️  Light" if st.session_state.theme == "dark" else "🌙  Dark"
        if st.button(thm_lbl, key="sb_thm", use_container_width=True):
            st.session_state.theme = "light" if st.session_state.theme == "dark" else "dark"
            st.rerun()

        st.markdown('<div style="height:1px;background:' + c["BORDER"] + ';margin:10px 0 6px;"></div>',
                    unsafe_allow_html=True)

        for page_key, info in PAGES.items():
            if st.button(
                info["icon"] + "  " + info["label"],
                key="sb_nav_" + page_key,
                use_container_width=True,
            ):
                st.session_state.page = page_key
                st.rerun()

        st.markdown('<div style="height:1px;background:' + c["BORDER"] + ';margin:10px 0 8px;"></div>',
                    unsafe_allow_html=True)

        try:
            api_ok = requests.get(API_BASE_URL + "/health", timeout=2).ok
        except Exception:
            api_ok = False

        try:
            agent_ok = requests.get(API_BASE_URL + "/agent/health", timeout=2).ok
        except Exception:
            agent_ok = False

        api_dot   = '<span style="color:#00c851;">●</span>' if api_ok   else '<span style="color:' + c["RED"] + ';">●</span>'
        agent_dot = '<span style="color:#00c851;">●</span>' if agent_ok else '<span style="color:' + c["ORANGE"] + ';">●</span>'

        st.markdown(
            '<div style="font-size:.72rem;color:' + c["GREY"] + ';padding:4px 2px;line-height:2.2;">'
            + api_dot + ' &nbsp;<strong style="color:' + c["WHITE"] + ';">API</strong>'
            ' &nbsp;' + ("Online" if api_ok else "Offline") + '<br>'
            + agent_dot + ' &nbsp;<strong style="color:' + c["WHITE"] + ';">AI Agent</strong>'
            ' &nbsp;' + ("Online" if agent_ok else "Offline") + '<br>'
            '<span style="color:#00c851;">●</span> &nbsp;'
            '<strong style="color:' + c["WHITE"] + ';">Ollama</strong> &nbsp;Ready'
            '</div>',
            unsafe_allow_html=True)

        st.markdown('<div style="height:1px;background:' + c["BORDER"] + ';margin:8px 0;"></div>',
                    unsafe_allow_html=True)

        st.markdown(
            '<div style="font-size:.67rem;color:' + c["GREY"] + ';padding:0 2px;line-height:1.9;">'
            '📦 ITC-EGYPT 2026<br>'
            '🐙 <a href="https://github.com/Goda-Emad/ITC-Egypt-2026-Spectrum-Anomaly-Detection"'
            ' target="_blank" style="color:' + c["TEAL"] + ';text-decoration:none;">GitHub</a>'
            ' &nbsp;·&nbsp;⏰ ' + datetime.now().strftime('%H:%M:%S') +
            '</div>',
            unsafe_allow_html=True)


def render_header():
    c = _colors()
    current = PAGES.get(st.session_state.page, PAGES["home"])
    st.markdown(
        '<div style="margin-bottom:1rem;">'
        '<h2 style="margin:0;color:' + c["WHITE"] + ';">'
        + current["icon"] + " " + current["label"] +
        '</h2>'
        '<p style="color:' + c["SUBTEXT"] + ';font-size:.85rem;margin:4px 0 0;">'
        'SADAR · Spectrum Anomaly Detection &amp; Response · ITC-EGYPT 2026'
        '</p></div>',
        unsafe_allow_html=True)
    st.markdown("---")


def render_footer():
    c = _colors()
    st.markdown("---")
    st.markdown(
        '<div style="text-align:center;padding:16px;font-size:.75rem;color:' + c["SUBTEXT"] + ';">'
        'SADAR | AI-Powered RF Spectrum Anomaly Detection | ITC-EGYPT 2026<br>'
        'Goda Emad (Team Leader &amp; AI Lead) · Mohamed Gharieb (Dashboard &amp; Signal Processing)'
        '</div>',
        unsafe_allow_html=True)


def main():
    _load_css_files()
    _inject_theme()
    render_sidebar()

    with st.container():
        render_header()
        page_fn = PAGES.get(st.session_state.page, PAGES["home"])["function"]
        page_fn()
        render_footer()


if __name__ == "__main__":
    main()
