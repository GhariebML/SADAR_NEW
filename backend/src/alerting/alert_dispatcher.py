# ════════════════════════════════════════════════════════════════
#  SADAR — Alert Dispatcher
#  يربط صفحة التنبيهات بـ Telegram + Gmail تلقائيًا
#  الاستخدام: استدعِ dispatch_alert(signal) من أي مكان في الكود
# ════════════════════════════════════════════════════════════════

import asyncio
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

from telegram_bot   import send_telegram_alert, test_bot_connection
from gmail_notifier import send_gmail_alert

load_dotenv()

CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "75"))

log = logging.getLogger("sadar.dispatcher")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)


# ── الدالة الرئيسية ───────────────────────────────────────────────────────────
async def dispatch_alert(signal: dict, channels: list[str] | None = None) -> dict:
    """
    يرسل التنبيه على كل القنوات المطلوبة لو الثقة تجاوزت العتبة.

    Parameters
    ----------
    signal   : بيانات الإشارة (نفس schema بتاع useStore)
    channels : ["telegram", "gmail"] — اتركها None لإرسال الكل

    Returns
    -------
    dict مع نتيجة كل قناة: {telegram: bool, gmail: bool}
    """
    channels = channels or ["telegram", "gmail"]

    confidence_pct = signal.get("confidence", 0) * 100
    label          = signal.get("label", "?")

    if confidence_pct <= CONFIDENCE_THRESHOLD:
        log.info(
            "⏭️  تجاهل — %s ثقة %.1f%% ≤ عتبة %.1f%%",
            label, confidence_pct, CONFIDENCE_THRESHOLD,
        )
        return {"telegram": False, "gmail": False, "skipped": True}

    log.info(
        "🚨 إشارة تتجاوز العتبة — %s %.1f%%",
        label, confidence_pct,
    )

    results: dict = {}

    # ── Telegram ──
    if "telegram" in channels:
        results["telegram"] = await send_telegram_alert(signal)

    # ── Gmail ──
    if "gmail" in channels:
        # Gmail sync — نشغّله في thread منفصل لعدم حجب event loop
        loop = asyncio.get_event_loop()
        results["gmail"] = await loop.run_in_executor(
            None, send_gmail_alert, signal
        )

    log.info("📬 نتائج الإرسال: %s", results)
    return results


# ── دالة مساعدة للاستخدام من كود sync ───────────────────────────────────────
def dispatch_alert_sync(signal: dict, channels: list[str] | None = None) -> dict:
    """نسخة sync — تفيد لو مش شغّال في async context."""
    return asyncio.run(dispatch_alert(signal, channels))


# ── محاكاة كاملة (simulation) ─────────────────────────────────────────────────
async def run_simulation() -> None:
    """
    محاكاة قريبة من واجهة SADAR:
      - ثلاث إشارات بثقات مختلفة
      - يرسل تنبيه فقط لمن تجاوزت 75%
    """
    print("\n" + "═" * 56)
    print("  SADAR — محاكاة نظام التنبيهات")
    print(f"  العتبة: {CONFIDENCE_THRESHOLD}%")
    print("═" * 56 + "\n")

    # تحقق من الاتصال بالبوت أولاً
    print("🔍 اختبار اتصال Telegram Bot …")
    connected = await test_bot_connection()
    if not connected:
        print("⚠️  Telegram Bot غير متصل — تحقق من .env\n")

    fake_signals = [
        {
            "label":      "Normal",
            "confidence": 0.45,        # 45% — لن يُرسل
            "frequency":  434.3,
            "snr":        9.49,
            "strength":   -70.17,
            "station":    "Port Said",
            "direction":  "E",
            "source":     "SIM-SDR-1",
            "timestamp":  datetime.utcnow().isoformat(),
        },
        {
            "label":      "Drone",
            "confidence": 0.87,        # 87% — سيُرسل ✅
            "frequency":  94.45,
            "snr":        28.12,
            "strength":   -58.55,
            "station":    "Cairo",
            "direction":  "SW",
            "source":     "SIM-SDR-1",
            "timestamp":  datetime.utcnow().isoformat(),
        },
        {
            "label":      "Jamming",
            "confidence": 0.79,        # 79% — سيُرسل ✅
            "frequency":  433.06,
            "snr":        25.35,
            "strength":   -77.14,
            "station":    "Giza",
            "direction":  "N",
            "source":     "SIM-SDR-1",
            "timestamp":  datetime.utcnow().isoformat(),
        },
    ]

    for sig in fake_signals:
        pct = sig["confidence"] * 100
        print(f"📡 إشارة: {sig['label']:<10} ثقة: {pct:.0f}%", end="  →  ")
        result = await dispatch_alert(sig)
        if result.get("skipped"):
            print("تجاهُل (أقل من العتبة)")
        else:
            tg = "✅ Telegram" if result.get("telegram") else "❌ Telegram"
            gm = "✅ Gmail"    if result.get("gmail")    else "❌ Gmail"
            print(f"{tg}  |  {gm}")

        await asyncio.sleep(1)   # تأخير بين الإشارات

    print("\n✔️  انتهت المحاكاة\n")


if __name__ == "__main__":
    asyncio.run(run_simulation())
