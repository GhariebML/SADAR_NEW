# ════════════════════════════════════════════════════════════════
#  SADAR — Gmail Notification Service  (v3.0 — Ensemble Compatible)
#  متوافق مع PyTorch Ensemble v3.0 و Smart Alert System
# ════════════════════════════════════════════════════════════════

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from dotenv import load_dotenv

_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(_ENV_PATH)

GMAIL_SENDER:       str = os.getenv("GMAIL_SENDER", "")
GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD", "")
GMAIL_RECEIVER:     str = os.getenv("GMAIL_RECEIVER", "")

log = logging.getLogger("sadar.gmail")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

LEVEL_CONFIG = {
    "danger":  {"color": "#DC2626", "icon": "🔴", "text": "خطر داهم"},
    "alert":   {"color": "#DC2626", "icon": "🔴", "text": "إنذار"},
    "warning": {"color": "#D97706", "icon": "🟡", "text": "تحذير"},
    "caution": {"color": "#EA580C", "icon": "🟠", "text": "تنبيه"},
    "weak":    {"color": "#2563EB", "icon": "🔵", "text": "إشارة ضعيفة"},
    "unknown": {"color": "#7C3AED", "icon": "⚠️", "text": "إشارة مجهولة"},
    "clear":   {"color": "#16A34A", "icon": "✅", "text": "آمن"},
}

LABEL_COLOR = {
    "Drone":   "#DC2626",
    "Jamming": "#D97706",
    "Normal":  "#16A34A",
    "Unknown": "#7C3AED",
}


def build_email_html(signal: dict) -> tuple[str, str]:
    label        = signal.get("label",        "غير معروف")
    confidence   = signal.get("confidence",   0) * 100
    threat_score = signal.get("threat_score", 0)
    threat_level = signal.get("threat_level", "warning").lower()
    is_unknown   = signal.get("is_unknown",   False)
    energy_score = signal.get("energy_score", 0)
    frequency    = signal.get("frequency",    0)
    snr          = signal.get("snr",          0)
    strength     = signal.get("strength",     "—")
    station      = signal.get("station",      "SDR-01")
    direction    = signal.get("direction",    "—")
    source       = signal.get("source",       "SDR-01")
    timestamp    = signal.get("timestamp",    datetime.utcnow().isoformat())

    if is_unknown:
        threat_level = "unknown"

    label_color = LABEL_COLOR.get(label, "#378ADD")
    level_cfg   = LEVEL_CONFIG.get(threat_level, LEVEL_CONFIG["warning"])
    level_color = level_cfg["color"]
    level_icon  = level_cfg["icon"]
    level_text  = level_cfg["text"]

    try:
        dt       = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        time_str = dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception:
        time_str = timestamp

    subject = (
        f"[SADAR] {level_icon} {label} — "
        f"Threat {threat_score}% | {level_text}"
    )

    unknown_badge = ""
    if is_unknown:
        unknown_badge = f"""
        <tr>
          <td colspan="2" style="padding:8px 16px;text-align:center;">
            <span style="background:#7C3AED18;color:#7C3AED;
                         border:1.5px solid #7C3AED60;border-radius:20px;
                         padding:4px 16px;font-size:13px;font-weight:700;">
              ⚠️ إشارة مجهولة — Open Set Detection
            </span>
          </td>
        </tr>"""

    table_rows = ""
    rows_data = [
        ("📻 التردد",        f"{frequency} MHz" if frequency else "—"),
        ("📉 SNR",           f"{snr} dB"        if snr       else "—"),
        ("⚡ القوة",         f"{strength} dBm"  if strength  else "—"),
        ("🏠 المحطة",       station),
        ("🧭 الاتجاه",      direction),
        ("🔌 المصدر",        source),
        ("🕐 الوقت",         time_str),
        # ✅ التعديل الوحيد — عرض مقرب زي الداشبورد
        ("🤖 ثقة الموديل",  f"{round(confidence)}%"),
        ("⚡ Energy Score",  f"{energy_score:.4f}"),
    ]
    for k, v in rows_data:
        table_rows += f"""
        <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:11px 16px;color:#6b7280;font-weight:600;
                       background:#f9fafb;width:42%;">{k}</td>
            <td style="padding:11px 16px;color:#111827;font-weight:700;">{v}</td>
        </tr>"""

    html = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f6f9;
                 font-family:Arial,sans-serif;direction:rtl;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f4f6f9;padding:32px 16px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:16px;overflow:hidden;
                        box-shadow:0 4px 24px rgba(0,0,0,0.08);">

            <!-- Header -->
            <tr>
              <td style="background:{level_color};padding:24px 32px;
                         text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">
                  {level_icon} تنبيه SADAR — {level_text}
                </h1>
                <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;
                          font-size:14px;">
                  نظام رصد إشارات RF — Ensemble PyTorch v3.0
                </p>
              </td>
            </tr>

            <!-- Label badge -->
            <tr>
              <td style="padding:24px 32px 0;text-align:center;">
                <span style="display:inline-block;
                             background:{label_color}18;
                             color:{label_color};
                             border:1.5px solid {label_color}60;
                             border-radius:30px;padding:8px 28px;
                             font-size:18px;font-weight:800;">{label}</span>
              </td>
            </tr>

            <!-- Threat Score -->
            <tr>
              <td style="padding:20px 32px 0;text-align:center;">
                <p style="margin:0;font-size:13px;color:#6b7280;">
                  Threat Score
                </p>
                <p style="margin:4px 0 0;font-size:48px;font-weight:900;
                          color:{level_color};">{threat_score}%</p>
                <div style="background:#f3f4f6;border-radius:8px;height:12px;
                            margin:12px 0 0;overflow:hidden;">
                  <div style="background:{level_color};height:100%;
                              width:{min(threat_score, 100)}%;
                              border-radius:8px;"></div>
                </div>
                <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                  مستوى التهديد:
                  <strong style="color:{level_color};">{level_text}</strong>
                </p>
              </td>
            </tr>

            {unknown_badge}

            <!-- Details table -->
            <tr>
              <td style="padding:24px 32px;">
                <table width="100%" cellpadding="0" cellspacing="0"
                       style="border:1px solid #e5e7eb;border-radius:12px;
                              overflow:hidden;font-size:14px;">
                  {table_rows}
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 32px 28px;text-align:center;
                         border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  رسالة تلقائية من نظام SADAR<br>
                  Ensemble: EfficientNetV2-S + ConvNeXt-Small + MaxViT-Tiny<br>
                  Open Set Detection — Energy Score Threshold
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """
    return subject, html


def send_gmail_alert(signal: dict) -> bool:
    if not GMAIL_SENDER:
        log.error("❌ GMAIL_SENDER فارغ — تحقق من .env: %s", _ENV_PATH)
        return False
    if not GMAIL_APP_PASSWORD:
        log.error("❌ GMAIL_APP_PASSWORD فارغ — تحقق من .env: %s", _ENV_PATH)
        return False
    if not GMAIL_RECEIVER:
        log.error("❌ GMAIL_RECEIVER فارغ — تحقق من .env: %s", _ENV_PATH)
        return False

    subject, html_body = build_email_html(signal)

    msg            = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"SADAR Alerts <{GMAIL_SENDER}>"
    msg["To"]      = GMAIL_RECEIVER
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(GMAIL_SENDER, GMAIL_APP_PASSWORD)
            smtp.sendmail(GMAIL_SENDER, GMAIL_RECEIVER, msg.as_string())
        log.info(
            "✅ إيميل أُرسل — label=%s | threat=%s%% | level=%s | unknown=%s",
            signal.get("label"),
            signal.get("threat_score", "?"),
            signal.get("threat_level", "?"),
            signal.get("is_unknown", False),
        )
        return True
    except smtplib.SMTPAuthenticationError:
        log.error("❌ خطأ مصادقة Gmail — تحقق من App Password في .env")
    except Exception as exc:
        log.error("❌ خطأ في الإرسال: %s", exc)

    return False


if __name__ == "__main__":
    SAMPLE = {
        "label":        "Jamming",
        "confidence":    0.92,
        "threat_score":  95,
        "threat_level": "danger",
        "is_unknown":    False,
        "energy_score": -2.341,
        "frequency":     915.0,
        "snr":           18.3,
        "strength":     -62.1,
        "station":      "Cairo Station",
        "direction":    "NW",
        "source":       "SIM-SDR-1",
        "timestamp":     datetime.utcnow().isoformat(),
    }
    print("📧 اختبار إرسال إيميل Gmail …")
    ok = send_gmail_alert(SAMPLE)
    print("✅ تم الإرسال!" if ok else "❌ فشل — راجع الـ logs")