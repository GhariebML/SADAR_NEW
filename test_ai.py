import requests
import json

url = "http://localhost:8000/api/v1/agent/ask"
headers = {"Content-Type": "application/json"}

print("=== Testing SADAR AI Agent Professional Fallback ===")

questions = [
    "كم عدد إشارات الدرون؟",
    "ما هي حالة التشويش الحالية؟",
    "ملخص عدد الإشارات كاملة"
]

for q in questions:
    print(f"\n[USER]: {q}")
    payload = {"question": q}
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"[AI]: {data.get('response', data)}")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")
