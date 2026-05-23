"""
app.py
------
Entry point - uses st.navigation for instant page switching
"""
import sys
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import streamlit as st

st.set_page_config(
    page_title="SADAR | Spectrum Anomaly Detection",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ✅ Load CSS مرة واحدة بس
@st.cache_resource
def _load_css():
    css_dir = os.path.join(os.path.dirname(__file__), "assets")
    css = ""
    for f in ["style.css", "theme.css", "typography.css", "components.css", "animations.css", "responsive.css"]:
        path = os.path.join(css_dir, f)
        if os.path.exists(path):
            try:
                css += open(path).read()
            except Exception:
                pass
    return css

css = _load_css()
if css:
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)

# ✅ Initialize session state
if "current_page" not in st.session_state:
    st.session_state.current_page = "🏠 Home"
if "theme" not in st.session_state:
    st.session_state.theme = "dark"

# ✅ Import pages — lazy بحيث مش كل الصفحات بتتحمل في نفس الوقت
def get_pages():
    from src.dashboard.pages.home           import show_home
    from src.dashboard.pages.realtime       import show_realtime
    from src.dashboard.pages.history        import show_history
    from src.dashboard.pages.alerts_log     import show_alerts_log
    from src.dashboard.pages.analytics      import show_analytics
    from src.dashboard.pages.reports        import show_reports
    from src.dashboard.pages.live_map       import show_live_map
    from src.dashboard.pages.agent_chat     import show_agent_chat
    from src.dashboard.pages.system_monitor import show_system_monitor

    return {
        "🏠 Home":              show_home,
        "📡 Real-time Monitor": show_realtime,
        "📜 History":           show_history,
        "🔔 Alerts Log":        show_alerts_log,
        "📊 Analytics":         show_analytics,
        "📄 Reports":           show_reports,
        "🗺️ Live Map":          show_live_map,
        "🤖 AI Agent":          show_agent_chat,
        "🖥️ System Monitor":    show_system_monitor,
    }

pages = get_pages()

# ✅ Sidebar
with st.sidebar:
    st.markdown("""
    <div style="display:flex;align-items:center;gap:10px;padding:16px 4px 14px;">
        <div style="font-size:2.2rem;">🛡️</div>
        <div>
            <div style="font-size:.88rem;font-weight:700;">SADAR</div>
            <div style="font-size:.58rem;color:#00e5ff;font-weight:600;letter-spacing:1.2px;">SPECTRUM ANOMALY DETECTION</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    # Theme toggle
    theme_label = "☀️ Light" if st.session_state.theme == "dark" else "🌙 Dark"
    if st.button(theme_label, use_container_width=True):
        st.session_state.theme = "light" if st.session_state.theme == "dark" else "dark"
        st.rerun()

    st.markdown("---")

    # ✅ Navigation — بدون st.rerun() عشان أسرع
    for page_name in pages:
        is_active = st.session_state.current_page == page_name
        # ✅ لون مختلف للصفحة الحالية
        if is_active:
            st.markdown(
                f'<div style="background:#00e5ff22;border:1px solid #00e5ff;border-radius:6px;padding:6px 12px;margin-bottom:4px;color:#00e5ff;font-weight:600;">{page_name}</div>',
                unsafe_allow_html=True,
            )
        else:
            if st.button(page_name, key=f"nav_{page_name}", use_container_width=True):
                st.session_state.current_page = page_name
                st.rerun()

    st.markdown("---")
    st.caption("ITC-EGYPT 2026")

# ✅ Render current page
current = st.session_state.current_page
if current in pages:
    pages[current]()
else:
    st.session_state.current_page = "🏠 Home"
    pages["🏠 Home"]()
