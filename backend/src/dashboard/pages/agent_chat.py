"""
agent_chat.py
-------------
AI Agent chat page for the RF Spectrum Anomaly Detection Dashboard.
"""
from __future__ import annotations

import os
import re
import requests
import streamlit as st

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000") + "/api/v1"

SUGGESTED_QUESTIONS = [
    "ما هي الترددات الشائعة لإشارات الدرون؟",
    "هل إشارة 2400 MHz واي فاي أم درون؟",
    "ما هو مستوى التهديد الحالي؟",
    "ما الفرق بين إشارة Drone و Jamming؟",
    "ما الإجراءات عند اكتشاف إشارة بثقة عالية؟",
]

BTN_STYLE = """
<style>
/* Suggested question buttons */
div[data-testid="column"] > div > div > div > button {
    background-color: #0d1f2d !important;
    color: #00e5ff !important;
    border: 1px solid #00e5ff44 !important;
    border-radius: 8px !important;
    font-size: 0.80rem !important;
    padding: 8px 4px !important;
    transition: all 0.2s !important;
}
div[data-testid="column"] > div > div > div > button:hover {
    background-color: #00e5ff18 !important;
    border-color: #00e5ff !important;
    color: #ffffff !important;
}

/* ✅ Chat messages RTL للعربي */
[data-testid="stChatMessage"] {
    border-radius: 12px !important;
    margin-bottom: 8px !important;
}
[data-testid="stChatMessage"] p,
[data-testid="stChatMessage"] div,
[data-testid="stChatMessage"] li {
    direction: rtl !important;
    text-align: right !important;
    font-family: 'Segoe UI', Arial, sans-serif !important;
    line-height: 1.9 !important;
}

/* لو الكلام إنجليزي يرجع LTR */
[data-testid="stChatMessage"] .ltr-text {
    direction: ltr !important;
    text-align: left !important;
}
</style>
"""


def _is_arabic(text: str) -> bool:
    """يكشف إذا كان النص يحتوي على عربي."""
    arabic_pattern = re.compile(r'[\u0600-\u06FF]')
    return bool(arabic_pattern.search(text))


def _render_message(content: str) -> None:
    """
    ✅ يعرض الرسالة مع RTL لو كانت عربي
    """
    if _is_arabic(content):
        # ✅ RTL للعربي
        st.markdown(
            f"""
            <div style="
                direction: rtl;
                text-align: right;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 0.95rem;
                line-height: 1.9;
                color: #edf2f7;
                padding: 4px 0;
            ">{_format_arabic_text(content)}</div>
            """,
            unsafe_allow_html=True,
        )
    else:
        # LTR للإنجليزي
        st.markdown(content)


def _format_arabic_text(text: str) -> str:
    """
    تنسيق النص العربي — تحويل Markdown بسيط لـ HTML
    """
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)

    # Headers
    text = re.sub(r'^### (.+)$', r'<h4 style="color:#00b4cc;margin:8px 0 4px;">\1</h4>', text, flags=re.MULTILINE)
    text = re.sub(r'^## (.+)$',  r'<h3 style="color:#00b4cc;margin:10px 0 6px;">\1</h3>', text, flags=re.MULTILINE)
    text = re.sub(r'^# (.+)$',   r'<h2 style="color:#00e5ff;margin:12px 0 8px;">\1</h2>', text, flags=re.MULTILINE)

    # Bullet points
    text = re.sub(
        r'^[-*] (.+)$',
        r'<div style="display:flex;gap:8px;margin:4px 0;justify-content:flex-end;">'
        r'<span>\1</span><span style="color:#00b4cc;">•</span></div>',
        text, flags=re.MULTILINE
    )

    # Numbered lists
    text = re.sub(
        r'^(\d+)\. (.+)$',
        r'<div style="display:flex;gap:8px;margin:6px 0;justify-content:flex-end;">'
        r'<span>\2</span><span style="color:#00b4cc;font-weight:700;">\1.</span></div>',
        text, flags=re.MULTILINE
    )

    # Horizontal rule
    text = text.replace('---', '<hr style="border:none;border-top:1px solid #2a4a6a;margin:10px 0;">')

    # Newlines
    text = re.sub(r'\n\n+', '<br><br>', text)
    text = re.sub(r'\n', '<br>', text)

    return text


def show_agent_chat():
    """Render the AI Agent chat page."""

    st.markdown(BTN_STYLE, unsafe_allow_html=True)
    st.caption("Chat with the SADAR AI Agent about RF signals, threats, and anomalies.")

    # ── Agent health ─────────────────────────────────────────────
    try:
        health     = requests.get(f"{API_BASE_URL}/agent/health", timeout=3).json()
        ollama     = health.get("ollama", {})
        ollama_ok  = ollama.get("ok", False) if isinstance(ollama, dict) else bool(ollama)
        models     = ollama.get("models", []) if isinstance(ollama, dict) else []
        model_name = models[0] if models else "command-r7b-arabic"
        if ollama_ok:
            st.markdown(
                f"""
                <div style="background:#00c85118;border:1px solid #00c851;
                            border-radius:8px;padding:10px 16px;
                            display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.2rem;">🟢</span>
                    <div>
                        <span style="color:#00c851;font-weight:700;">AI Agent Online</span>
                        <span style="color:#aaa;font-size:0.8rem;margin-left:12px;">
                            Model: {model_name}
                        </span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        else:
            st.warning("🟡 Agent Online — Ollama still loading, responses may be slow")
    except Exception:
        st.warning("⚠️ Cannot reach API — make sure the server is running on port 8000")

    st.markdown("---")

    # ── Session state ────────────────────────────────────────────
    if "chat_messages" not in st.session_state:
        st.session_state.chat_messages = []

    # ── Suggested questions ──────────────────────────────────────
    if not st.session_state.chat_messages:
        st.markdown(
            '<div style="color:#00e5ff;font-weight:700;font-size:0.95rem;'
            'margin-bottom:10px;">💡 SUGGESTED QUESTIONS</div>',
            unsafe_allow_html=True,
        )
        cols = st.columns(len(SUGGESTED_QUESTIONS))
        for col, q in zip(cols, SUGGESTED_QUESTIONS):
            if col.button(q, use_container_width=True, key=f"sq_{q[:20]}"):
                st.session_state.chat_messages.append({"role": "user", "content": q})
                st.rerun()
        st.markdown("---")

    # ── Render history ───────────────────────────────────────────
    for msg in st.session_state.chat_messages:
        with st.chat_message(msg["role"]):
            _render_message(msg["content"])

    # ── Chat input ───────────────────────────────────────────────
    if prompt := st.chat_input(
        "اسأل عن الإشارات أو التهديدات... / Ask about signals or threats..."
    ):
        st.session_state.chat_messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            _render_message(prompt)

        with st.chat_message("assistant"):
            with st.spinner("SADAR AI analyzing..."):
                try:
                    resp = requests.post(
                        f"{API_BASE_URL}/agent/ask",
                        json={"question": prompt, "refresh": False, "top_k": 5},
                        timeout=185,
                    )
                    if resp.ok:
                        data   = resp.json()
                        answer = data.get("answer", str(data))
                        sources = data.get("sources", [])
                        clean_sources = [
                            s for s in sources
                            if s and "README" not in s and len(s) > 3
                        ]
                        if clean_sources:
                            answer += f"\n\n---\n📚 **Sources:** {', '.join(clean_sources[:3])}"
                    else:
                        answer = f"⚠️ Agent error {resp.status_code}: {resp.text[:200]}"

                except requests.Timeout:
                    answer = "⏱️ النموذج استغرق وقتاً طويلاً — حاول مرة أخرى."
                except requests.RequestException as exc:
                    answer = f"❌ Cannot reach AI Agent: {exc}"

            _render_message(answer)
            st.session_state.chat_messages.append(
                {"role": "assistant", "content": answer}
            )

    # ── Toolbar ──────────────────────────────────────────────────
    if st.session_state.chat_messages:
        st.markdown("---")
        col1, col2, _ = st.columns([1, 1, 4])
        with col1:
            if st.button("🗑️ Clear Chat", use_container_width=True):
                st.session_state.chat_messages = []
                st.rerun()
        with col2:
            history_text = "\n\n".join(
                f"**{m['role'].upper()}:** {m['content']}"
                for m in st.session_state.chat_messages
            )
            st.download_button(
                "⬇️ Export",
                history_text,
                "chat_history.md",
                "text/markdown",
                use_container_width=True,
            )
