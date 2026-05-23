# ════════════════════════════════════════════════════════════════
#  SADAR — Telegram Bot Notification Service
#  يرسل تنبيه تلقائي لـ Telegram لما الثقة تتعدى 75%
#  المشغّل: SDR-01
# ════════════════════════════════════════════════════════════════

import os
import asyncio
import logging
from datetime import datetime
from typing import Optional

import httpx                        # pip install httpx
from dotenv import load_dotenv      # pip install python-dotenv

load_dotenv()

# ── إعدادات البوت ────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID:   str = os.getenv("TELEGRAM_CHAT_ID",   "")

# عتبة الثقة (%) — تنبيه لما الثقة تتعدى هذه القيمة
CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "75"))

TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("sadar.telegram")


# ── بناء رسالة التنبيه ────────────────────────────────────────────────────────
def build_message(signal: dict) -> str:
    """
    يبني نص الرسالة من بيانات الإشارة.

    signal keys المتوقعة:
        label       : str   — نوع الإشارة  (Drone / Jamming / Normal)
        confidence  : float — نسبة الثقة   (0.0 – 1.0)
        frequency   : float — التردد بالـ MHz
        snr         : float — نسبة SNR بالـ dB
        strength    : float — قوة الإشارة
        station     : str   — المحطة
        direction   : str   — الاتجاه
        source      : str   — مصدر الإشارة  (مثال: SIM-SDR-1)
        timestamp   : str   — الطابع الزمني ISO
    """
    label:      str   = signal.get("label", "غير معروف")
    confidence: float = signal.get("confidence", 0) * 100
    frequency:  float = signal.get("frequency", 0)
    snr:        float = signal.get("snr", 0)
    strength:   float = signal.get("strength", 0)
    station:    str   = signal.get("station", "—")
    direction:  str   = signal.get("direction", "—")
    source:     str   = signal.get("source", "SDR-01")
    timestamp:  str   = signal.get("timestamp", datetime.utcnow().isoformat())

    # أيقونة حسب نوع الإشارة
    icons = {"Drone": "🚁", "Jamming": "📡", "Normal": "✅"}
    icon = icons.get(label, "⚠️")

    # تنسيق الوقت
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        time_str = dt.strftime("%Y-%m-%d  %H:%M:%S UTC")
    except Exception:
        time_str = timestamp

    return (
        f"{icon} *تنبيه SADAR — {label}*\n"
        f"{'─' * 32}\n"
        f"📶 *الثقة:*     `{confidence:.1f}%`\n"
        f"📻 *التردد:*    `{frequency} MHz`\n"
        f"📉 *SNR:*       `{snr} dB`\n"
        f"⚡ *القوة:*     `{strength}`\n"
        f"🏠 *المحطة:*   `{station}`\n"
        f"🧭 *الاتجاه:*  `{direction}`\n"
        f"🔌 *المصدر:*   `{source}`\n"
        f"🕐 *الوقت:*    `{time_str}`\n"
        f"{'─' * 32}\n"
        f"⚙️ _عتبة التنبيه: {CONFIDENCE_THRESHOLD}%_"
    )


# ── إرسال رسالة واحدة ────────────────────────────────────────────────────────
async def send_telegram_alert(signal: dict) -> bool:
    """
    يرسل تنبيه تيليجرام إذا تجاوزت الثقة العتبة المحددة.
    يُرجع True لو الإرسال نجح.
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        log.error("TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير موجود في .env")
        return False

    confidence_pct = signal.get("confidence", 0) * 100
    if confidence_pct <= CONFIDENCE_THRESHOLD:
        log.debug(
            "الثقة %.1f%% أقل من أو تساوي العتبة %.1f%% — لا يوجد تنبيه",
            confidence_pct, CONFIDENCE_THRESHOLD,
        )
        return False

    message = build_message(signal)

    payload = {
        "chat_id":    TELEGRAM_CHAT_ID,
        "text":       message,
        "parse_mode": "Markdown",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json=payload,
            )
            response.raise_for_status()
            log.info(
                "✅ تم إرسال التنبيه — %s (%.1f%%)",
                signal.get("label"), confidence_pct,
            )
            return True

    except httpx.HTTPStatusError as exc:
        log.error("❌ خطأ HTTP %s: %s", exc.response.status_code, exc.response.text)
    except httpx.RequestError as exc:
        log.error("❌ خطأ في الاتصال: %s", exc)

    return False


# ── إرسال دفعة (batch) ────────────────────────────────────────────────────────
async def send_batch_alerts(signals: list[dict]) -> dict:
    """
    يعالج قائمة إشارات ويرسل تنبيه لكل إشارة تتجاوز العتبة.
    يُرجع ملخص: {sent, skipped, failed}
    """
    sent = skipped = failed = 0

    for signal in signals:
        confidence_pct = signal.get("confidence", 0) * 100
        if confidence_pct <= CONFIDENCE_THRESHOLD:
            skipped += 1
            continue

        success = await send_telegram_alert(signal)
        if success:
            sent += 1
        else:
            failed += 1

        # تأخير بسيط بين الرسائل لتجنب Rate Limit
        await asyncio.sleep(0.4)

    log.info("📊 الدفعة انتهت — أُرسل: %d | تجاوز: %d | فشل: %d", sent, skipped, failed)
    return {"sent": sent, "skipped": skipped, "failed": failed}


# ── اختبار البوت ─────────────────────────────────────────────────────────────
async def test_bot_connection() -> bool:
    """يتحقق أن الـ Token صحيح عبر getMe."""
    if not TELEGRAM_BOT_TOKEN:
        log.error("TELEGRAM_BOT_TOKEN غير موجود")
        return False
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"{TELEGRAM_API}/getMe")
            r.raise_for_status()
            info = r.json().get("result", {})
            log.info("🤖 البوت متصل: @%s (%s)", info.get("username"), info.get("first_name"))
            return True
    except Exception as exc:
        log.error("❌ فشل الاتصال بالبوت: %s", exc)
        return False


# ── تشغيل يدوي / محاكاة ──────────────────────────────────────────────────────
if __name__ == "__main__":
    # بيانات إشارة وهمية للاختبار — الثقة 87% تتجاوز العتبة (75%)
    SAMPLE_SIGNAL = {
        "label":      "Drone",
        "confidence": 0.87,          # 87% — سيُرسل تنبيه
        "frequency":  433.92,
        "snr":        22.5,
        "strength":   -58.3,
        "station":    "Cairo",
        "direction":  "SW",
        "source":     "SIM-SDR-1",
        "timestamp":  datetime.utcnow().isoformat(),
    }

    async def main() -> None:
        print("\n🔍 اختبار اتصال البوت …")
        connected = await test_bot_connection()
        if not connected:
            print("❌ تحقق من TELEGRAM_BOT_TOKEN في ملف .env")
            return

        print(f"\n📡 اختبار إرسال تنبيه (ثقة: {SAMPLE_SIGNAL['confidence']*100:.0f}%) …")
        sent = await send_telegram_alert(SAMPLE_SIGNAL)
        print("✅ الرسالة أُرسلت!" if sent else "⏭️  لم تُرسل (الثقة أقل من العتبة أو خطأ)")

    asyncio.run(main())
