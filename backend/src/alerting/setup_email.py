import os
import sys
import getpass
from pathlib import Path

def main():
    env_path = Path(__file__).parent / ".env"
    
    print("=" * 60)
    print("  إعداد إشعارات البريد الإلكتروني (Gmail) لـ SADAR  ")
    print("=" * 60)
    
    sender = input("أدخل بريد الـ Gmail (الذي سيقوم بالإرسال): ").strip()
    if not sender:
        print("❌ يجب إدخال بريد إلكتروني.")
        return
        
    app_pass = getpass.getpass("أدخل كلمة مرور التطبيقات (لن تظهر الحروف أثناء الكتابة): ").replace(" ", "").strip()
    if not app_pass:
        print("❌ كلمة المرور مطلوبة.")
        return
        
    receiver = input("أدخل البريد الذي سيتلقى الإشعارات (اضغط Enter لو هو نفس بريد المرسل): ").strip()
    if not receiver:
        receiver = sender
        
    # Write to .env
    try:
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(f"GMAIL_SENDER={sender}\n")
            f.write(f"GMAIL_APP_PASSWORD={app_pass}\n")
            f.write(f"GMAIL_RECEIVER={receiver}\n")
        print(f"\n✅ تم حفظ الإعدادات بنجاح في الملف المخفي: {env_path.name}")
    except Exception as e:
        print(f"❌ حدث خطأ أثناء الحفظ: {e}")
        return

    # Set OS environ temporarily for the test run so the module picks it up
    os.environ["GMAIL_SENDER"] = sender
    os.environ["GMAIL_APP_PASSWORD"] = app_pass
    os.environ["GMAIL_RECEIVER"] = receiver
    
    print("\nجاري إرسال بريد اختباري للتأكد من نجاح الإعدادات...")
    
    # Import locally so it picks up the environment variables
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
        from src.alerting.gmail_notifier import send_gmail_alert
        
        test_signal = {
            "label": "Test Complete",
            "confidence": 1.0,
            "threat_score": 100,
            "threat_level": "clear",
            "frequency": 2400,
            "snr": 15,
            "strength": -45,
            "station": "SADAR-CORE",
            "direction": "N/A"
        }
        
        success = send_gmail_alert(test_signal)
        if success:
            print("✅ نجاح! تم إرسال رسالة الاختبار بنجاح.")
            print("يمكنك الآن التحقق من صندوق الوارد (Inbox) الخاص بك.")
        else:
            print("❌ فشل الإرسال! يرجى التأكد من التالي:")
            print("1. إيميل المرسل صحيح.")
            print("2. كلمة مرور التطبيقات صحيحة (تأكد من عدم استخدام مسافات أو كلمة مرور حسابك العادية).")
            print("3. ميزة التحقق بخطوتين (2FA) مفعلة في حسابك لتتمكن من استخدام App Passwords.")
    except Exception as e:
        print(f"❌ حدث خطأ أثناء تجربة الإرسال: {e}")

if __name__ == "__main__":
    main()
