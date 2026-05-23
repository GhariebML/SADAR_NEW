"""
SADAR — agent_routes.py  (v4.4 — fixed MHz regex in detect_intent)
==========================================================
"""
from __future__ import annotations

import re
import sys
import os
import asyncio
import logging
import numpy as np
from datetime import datetime
from dataclasses import dataclass
from typing import Any

import requests
from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../database"))

log = logging.getLogger("sadar.agent")

router = APIRouter(prefix="/agent", tags=["AI Agent"])

OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "command-r7b-arabic:7b-02-2025-q4_K_M"

OLLAMA_OPTIONS = {
    "temperature":    0.3,
    "top_p":          0.90,
    "repeat_penalty": 1.15,
    "num_predict":    1200,
    "stop":           ["<|END|>", "###"],
}

FREQ_DB: list[tuple] = [
    (76,   108,  "راديو FM",              "FM Radio",           "low",
     "بث راديوي تجاري عادي — لا يشكّل أي خطر أمني"),
    (136,  174,  "اتصالات جوية",           "Airband VHF",        "low",
     "تردد التحكم في الطيران المدني — طبيعي في المناطق المجاورة للمطارات"),
    (400,  512,  "تشويش اتصالات",          "Comm Jamming",       "critical",
     "هذا النطاق يستخدم لتشويش الاتصالات الحكومية والعسكرية — خطر بالغ"),
    (406,  406,  "EPIRB / نداء نجدة",     "Emergency Beacon",   "medium",
     "إشارة نداء نجدة دولية — تحتاج تحقق فوري"),
    (433,  435,  "ISM 433MHz",            "ISM 433",            "medium",
     "يستخدمه الريموت كنترول والـ drone الرخيصة وأجهزة IoT — يستحق المراقبة"),
    (850,  960,  "GSM / شبكات جوال",      "GSM 900",            "low",
     "شبكات الجوال القياسية — إشارة طبيعية تماماً"),
    (900,  930,  "Drone ISM 915MHz",      "Drone ISM 915",      "high",
     "النطاق الأكثر شيوعاً للتحكم في الطائرات المسيّرة — أي إشارة قوية هنا تستوجب التحقيق"),
    (915,  916,  "Drone Control 915MHz",  "Drone 915",          "high",
     "تردد 915 MHz هو التردد الأساسي لكثير من الـ drones التجارية كـ DJI Mavic"),
    (1164, 1215, "GPS L5",                "GPS L5",             "medium",
     "نطاق GPS الحديث — الإشارة الطبيعية ضعيفة جداً، أي قوة غير عادية = خطر"),
    (1227, 1228, "GPS L2",                "GPS L2",             "medium",
     "GPS العسكري والدقيق — الإشارة الطبيعية ضعيفة جداً"),
    (1559, 1610, "GPS L1 / تشويش GPS",   "GPS L1 / Jamming",   "critical",
     "أي إشارة قوية هنا = تشويش على نظام الملاحة — يعطّل الطيران والسفن — خطر حرج"),
    (1575, 1576, "GPS L1",               "GPS L1",             "critical",
     "تردد GPS الرئيسي — إشارة طبيعية ضعيفة جداً؛ إشارة قوية = تشويش"),
    (1700, 2100, "LTE / 4G",             "LTE",                "low",
     "شبكات الجوال الحديثة — طبيعي تماماً"),
    (2400, 2485, "WiFi 2.4GHz / BT / Drone", "WiFi/BT/Drone",  "medium",
     "نطاق مزدحم: WiFi + Bluetooth + التحكم في الـ drone — يحتاج تحليل إضافي"),
    (2412, 2484, "WiFi 2.4GHz",          "WiFi 2.4",           "low",
     "شبكة WiFi لاسلكية عادية"),
    (5150, 5350, "WiFi 5GHz Low",         "WiFi 5L",            "low",
     "WiFi سريع — طبيعي"),
    (5725, 5850, "WiFi 5GHz / Drone Video", "Drone Video",      "high",
     "بث الفيديو من الطائرة المسيّرة — إذا لم يكن WiFi فهو drone في وضع البث"),
]

THREAT_AR = {
    "low":      "✅ منخفض",
    "medium":   "⚠️ متوسط",
    "high":     "🔴 مرتفع",
    "critical": "🚨 حرج",
}
THREAT_PRIORITY = {"low": 1, "medium": 2, "high": 3, "critical": 4}

STATIONS = {
    "alexandria": "Alexandria Station",
    "cairo":      "Cairo Station",
    "giza":       "Giza Station",
}

SDR_STATIONS = {
    "SIM-SDR-1": {"lat": 30.0444, "lon": 31.2357, "name": "Cairo Station"},
    "SIM-SDR-2": {"lat": 31.2001, "lon": 29.9187, "name": "Alexandria Station"},
    "SIM-SDR-3": {"lat": 30.0131, "lon": 31.2089, "name": "Giza Station"},
    "SDR-01":    {"lat": 30.0444, "lon": 31.2357, "name": "Main Station"},
    "SDR":       {"lat": 30.0444, "lon": 31.2357, "name": "Default Station"},
}

COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

_EMPTY_LOCATION = ('', 'unknown', 'مجهول', 'غير محدد', 'none', 'null')


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _get_station_name(source: str | None) -> str:
    if not source:
        return "Default Station"
    for key, station in SDR_STATIONS.items():
        if key.lower() in source.lower():
            return station["name"]
    return "Default Station"


def _resolve_location(location: str | None, source: str | None) -> str:
    if location and location.strip().lower() not in _EMPTY_LOCATION:
        return location.strip()
    return _get_station_name(source)


def _simulate_direction(station_name: str, frequency: float | None,
                        signal_id: int, label: str) -> tuple[float, str]:
    rng   = np.random.default_rng(seed=int(signal_id) % 1000)
    angle = (frequency * 7.3) % 360 if frequency else rng.uniform(0, 360)
    comp  = COMPASS[int((angle + 22.5) // 45) % 8]
    return angle, comp


def _get_strength_label(confidence: float) -> str:
    if confidence > 0.8:   return "🔴 Strong"
    elif confidence > 0.5: return "🟠 Medium"
    else:                  return "🟡 Weak"


def _get_freq(s: dict) -> str:
    val = s.get("frequency") or s.get("frequency_mhz")
    return str(val) if val is not None else "?"


def _get_station(s: dict) -> str:
    val = s.get("station")
    if val and str(val).strip() and str(val).strip().lower() not in ("unknown", "none", "null", ""):
        return str(val).strip()
    return _get_station_name(str(s.get("source", "SDR")))


def _get_direction(s: dict) -> str:
    val = s.get("direction")
    if val and str(val).strip() and str(val).strip().lower() not in ("none", "null", ""):
        return str(val).strip()
    freq      = s.get("frequency") or s.get("frequency_mhz")
    signal_id = s.get("id", 1)
    label     = s.get("label", "Normal")
    station   = _get_station(s)
    try:
        angle, comp = _simulate_direction(station, float(freq) if freq else None, int(signal_id), label)
        return f"{angle:.0f}° ({comp})"
    except Exception:
        return "—"


def _get_strength(s: dict) -> str:
    val = s.get("strength")
    if val is not None and str(val).strip() not in ("none", "null", ""):
        try:    return f"{float(val):.1f} dBm"
        except: return str(val)
    return _get_strength_label(float(s.get("confidence", 0)))


def _get_snr(s: dict) -> str:
    val = s.get("snr") or s.get("snr_db")
    return f"{float(val):.1f}" if val is not None else "?"


def _read_db(limit: int = 100) -> list[dict]:
    try:
        from crud import get_all_signals
        return get_all_signals()[:limit] or []
    except Exception as e:
        log.warning(f"DB read failed: {e}")
        return []


def _rag_query(question: str, top_k: int = 4) -> str:
    try:
        from rag import query_rag
        results = query_rag(question, top_k=top_k)
        if not results:
            return ""
        chunks = [r.get("text") or r.get("content") or str(r) for r in results]
        return "\n---\n".join(chunks[:top_k])
    except Exception as e:
        log.debug(f"RAG query failed: {e}")
        return ""


# ─────────────────────────────────────────────
# CLASSIFY FREQ
# ─────────────────────────────────────────────

def classify_freq(mhz: float | None) -> dict:
    if mhz is None:
        return {"name_ar": "تردد غير محدد", "name_en": "Unknown",
                "threat": "medium", "explanation": "لم يحدد تردد الإشارة"}
    best, best_p = None, -1
    for lo, hi, nar, nen, thr, exp in FREQ_DB:
        if lo <= mhz <= hi:
            p = THREAT_PRIORITY[thr]
            if p > best_p:
                best_p = p
                best = {"name_ar": nar, "name_en": nen, "threat": thr, "explanation": exp}
    return best or {
        "name_ar": f"نطاق {mhz:.1f} MHz غير مصنّف",
        "name_en": f"{mhz:.1f} MHz unclassified",
        "threat": "medium",
        "explanation": f"التردد {mhz} MHz خارج القواميس المعروفة — يحتاج تحليلاً يدوياً",
    }


# ─────────────────────────────────────────────
# BAND FILTER
# ─────────────────────────────────────────────

def _same_band(s: dict, target_mhz: float | None, tolerance: float = 200.0) -> bool:
    if not target_mhz:
        return True
    f_str = _get_freq(s)
    try:
        f = float(f_str)
    except (ValueError, TypeError):
        return False
    target_band = classify_freq(target_mhz).get("name_en", "")
    signal_band = classify_freq(f).get("name_en", "")
    if target_band and signal_band and target_band == signal_band:
        return True
    return abs(f - target_mhz) <= tolerance


# ─────────────────────────────────────────────
# INTENT DETECTOR
# ─────────────────────────────────────────────

@dataclass
class Intent:
    kind: str = "general"
    label: str | None = None
    location: str | None = None
    freq: float | None = None
    direction: str | None = None
    raw: str = ""


_LABEL_KW = {
    "Drone":   ["drone", "درون", "طائرة", "uav", "طيارة"],
    "Jamming": ["jamming", "jam", "تشويش", "jammer"],
    "Normal":  ["normal", "طبيعي", "عادي", "safe"],
    "GPS":     ["gps", "جي بي اس", "ملاحة", "navigation"],
}
_LOC_KW = {
    "alexandria": ["اسكندرية", "إسكندرية", "alexandria", "alex"],
    "cairo":      ["قاهرة", "القاهرة", "cairo"],
    "giza":       ["جيزة", "الجيزة", "giza"],
}
_DIR_KW = {
    "N":  ["شمال", "north"], "S": ["جنوب", "south"],
    "E":  ["شرق", "east"],   "W": ["غرب", "west"],
    "NE": ["شمال شرق", "northeast"],
    "NW": ["شمال غرب", "northwest"],
}


def detect_intent(q: str) -> Intent:
    ql = q.lower()
    intent = Intent(raw=q)

    for lbl, kws in _LABEL_KW.items():
        if any(k in ql for k in kws):
            intent.label = lbl; break

    for loc, kws in _LOC_KW.items():
        if any(k in ql for k in kws):
            intent.location = loc; break

    # ✅ v4.4: الإصلاح الرئيسي — بيدور على رقم قبله MHz بالظبط فقط
    # بكده "75%" مش هيتأخذ لأن بعده % مش MHz
    m = re.search(
        r"(\d{2,5}(?:\.\d+)?)\s*(?:mhz|ميغاهرتز|ميجاهرتز|ميغاهرتز|ميغا)",
        ql,
        re.IGNORECASE,
    )
    if m:
        v = float(m.group(1))
        if 10 < v < 8000:
            intent.freq = v
    else:
        # ✅ fallback: لو مفيش MHz في النص، دور على التردد في حقل "التردد: X"
        m2 = re.search(r"التردد\s*[:：]\s*(\d{2,5}(?:\.\d+)?)", q)
        if m2:
            v = float(m2.group(1))
            if 10 < v < 8000:
                intent.freq = v

    for d, kws in _DIR_KW.items():
        if any(k in ql for k in kws):
            intent.direction = d; break

    if any(w in ql for w in ["فين", "أين", "where", "موقع", "location", "مكان", "محطة"]):
        intent.kind = "location"
    elif any(w in ql for w in ["أخطر", "خطر", "threat", "تهديد", "أقوى", "worst"]):
        intent.kind = "threat"
    elif intent.freq and any(w in ql for w in ["إيه", "ما هو", "what", "يعني", "explain", "اشرح", "تردد"]):
        intent.kind = "frequency"
    elif any(w in ql for w in ["إحصاء", "كم", "عدد", "count", "stats", "total", "ملخص", "summary"]):
        intent.kind = "stats"
    elif any(w in ql for w in ["تقرير", "report", "وثّق", "document"]):
        intent.kind = "report"
    elif any(w in ql for w in ["آخر", "أحدث", "latest", "recent", "جديد"]):
        intent.kind = "timeline"

    return intent


# ─────────────────────────────────────────────
# SYSTEM IDENTITY
# ─────────────────────────────────────────────

SYSTEM_IDENTITY = """\
أنت "SADAR AI" — محلل ذكي متخصص في تحليل إشارات الترددات الراديوية (RF) \
لمنظومة SADAR المصرية لرصد التهديدات الجوية والإلكترونية.

شخصيتك:
- تتكلم بشكل طبيعي ومباشر كمحلل خبير
- لو السؤال بالعربي تجاوب بالعربي الطبيعي
- لو السؤال بالإنجليزي تجاوب بالإنجليزي
- تستخدم الأرقام الحقيقية من البيانات في ردودك
- ردودك واضحة ومنظمة بدون تعقيد زائد

قواعد التنسيق — مهم جداً:
- لا تستخدم رموز Markdown أبداً: لا # لا ## لا ** لا * لا --- لا ``` لا |---|
- اكتب بنثر عربي طبيعي منظم فقط
- للعناوين: اكتب النص ثم نقطتين — مثال: "ملخص تنفيذي: ..."
- للقوائم: استخدم الأرقام أو الحروف — مثال: "١. كذا  ٢. كذا"
- للتأكيد: استخدم الأقواس أو الكلمات — لا تضع نجمة حول النص\
"""


# ─────────────────────────────────────────────
# OLLAMA CALLER
# ─────────────────────────────────────────────

def _ollama(prompt: str, timeout: int = 150, options: dict | None = None) -> str:
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={
                "model":   OLLAMA_MODEL,
                "prompt":  prompt,
                "stream":  False,
                "options": options or OLLAMA_OPTIONS,
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        text = resp.json().get("response", "").strip()
        text = re.sub(r"<\|.*?\|>", "", text).strip()
        return text or "لم أتمكن من توليد رد — حاول مرة أخرى."
    except requests.exceptions.ConnectionError:
        raise RuntimeError("❌ Ollama غير متاح على localhost:11434")
    except requests.exceptions.Timeout:
        raise RuntimeError("⏱️ الموديل استغرق وقتاً طويلاً — حاول مرة أخرى")
    except Exception as e:
        raise RuntimeError(f"خطأ في Ollama: {e}")


def _strip_markdown(text: str) -> str:
    """يمسح رموز Markdown من رد الـ AI عشان يتعرض كنثر طبيعي في الشات."""
    text = re.sub(r"^#{1,4}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", text)
    text = re.sub(r"^[-=]{3,}\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"^\|[-| :]+\|$", "", text, flags=re.MULTILINE)
    text = re.sub(
        r"^\|(.+)\|$",
        lambda m: " — ".join(c.strip() for c in m.group(1).split("|") if c.strip()),
        text, flags=re.MULTILINE,
    )
    text = re.sub(r"^[\-\*]\s+", "• ", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ─────────────────────────────────────────────
# DB HELPERS
# ─────────────────────────────────────────────

def _db_summary(signals: list[dict]) -> str:
    if not signals:
        return "قاعدة البيانات فارغة حتى الآن."
    label_cnt:   dict[str, int] = {}
    station_cnt: dict[str, int] = {}
    drone_freqs: list[float]    = []
    for s in signals:
        lb  = s.get("label", "Unknown")
        st  = _get_station(s)
        frq = _get_freq(s)
        label_cnt[lb]   = label_cnt.get(lb, 0) + 1
        station_cnt[st] = station_cnt.get(st, 0) + 1
        if lb == "Drone" and frq != "?":
            try: drone_freqs.append(float(frq))
            except: pass
    lines = [
        f"إجمالي الإشارات: {len(signals)}",
        "حسب النوع: " + " | ".join(f"{k}={v}" for k, v in label_cnt.items()),
        "حسب المحطة: " + " | ".join(f"{k}={v}" for k, v in station_cnt.items()),
    ]
    if drone_freqs:
        avg = sum(drone_freqs) / len(drone_freqs)
        lines.append(f"متوسط تردد Drone: {avg:.1f} MHz | أعلى: {max(drone_freqs):.1f} MHz")
    return "\n".join(lines)


def _db_recent(signals: list[dict], n: int = 10,
               label_filter: str | None = None,
               station_filter: str | None = None,
               freq_filter: float | None = None) -> str:
    filtered = signals
    if label_filter:
        filtered = [s for s in filtered if s.get("label", "").lower() == label_filter.lower()]
    if station_filter:
        filtered = [s for s in filtered if station_filter.lower() in _get_station(s).lower()]
    if freq_filter:
        def freq_match(s):
            f = _get_freq(s)
            try:    return abs(float(f) - freq_filter) < 60
            except: return False
        filtered = [s for s in filtered if freq_match(s)]
    if not filtered:
        return "لا توجد إشارات مطابقة."
    lines = [f"({len(filtered)} إشارة — آخر {min(n, len(filtered))}):"]
    for s in filtered[:n]:
        freq  = _get_freq(s)
        conf  = s.get("confidence", 0)
        label = s.get("label", "?")
        sta   = _get_station(s)
        dirn  = _get_direction(s)
        strg  = _get_strength(s)
        snr   = _get_snr(s)
        ts    = str(s.get("timestamp", ""))[:19]
        finfo = classify_freq(float(freq)) if freq != "?" else {}
        band  = finfo.get("name_ar", "") if finfo else ""
        row   = f"  [{ts}] {label} ({float(conf):.0%}) @ {freq} MHz"
        if sta  != "—": row += f" | {sta}"
        if dirn != "—": row += f" | {dirn}"
        if strg != "—": row += f" | {strg}"
        if snr  != "?": row += f" | SNR={snr}dB"
        if band:         row += f"  ← {band}"
        lines.append(row)
    return "\n".join(lines)


# ─────────────────────────────────────────────
# AGENT PROMPT & PROCESS
# ─────────────────────────────────────────────

def _make_prompt(intent: Intent, db_summary: str, db_detail: str,
                 rag_context: str, freq_info: dict | None) -> str:
    freq_block = ""
    if freq_info:
        freq_block = f"""
══ معلومات التردد ══
التردد    : {intent.freq} MHz
النطاق    : {freq_info['name_ar']} ({freq_info['name_en']})
الخطورة   : {THREAT_AR.get(freq_info['threat'], freq_info['threat'])}
التفسير   : {freq_info['explanation']}
"""
    rag_block = ""
    if rag_context.strip():
        rag_block = f"\n══ معلومات من قاعدة المعرفة ══\n{rag_context}\n"

    guidance = {
        "location":  "ركّز على المواقع — فين الإشارات؟ أي محطة؟ أي اتجاه؟",
        "threat":    "ركّز على التهديدات — ما أخطر إشارة؟ ما التوصية الفورية؟",
        "frequency": "اشرح هذا التردد بعمق — ما هو؟ من يستخدمه؟ لماذا هو خطير أو آمن؟",
        "stats":     "أعطِ إحصائيات واضحة — أرقام، نسب، مقارنات.",
        "report":    "اكتب تقريراً احترافياً: ملخص تنفيذي، تفاصيل، تقييم، توصيات.",
        "timeline":  "ركّز على أحدث البيانات — ما آخر ما رُصد؟ متى؟ من أي محطة؟",
        "general":   "أجب بشكل طبيعي وذكي على السؤال مستخدماً كل البيانات المتاحة.",
    }.get(intent.kind, "أجب بشكل طبيعي وذكي على السؤال.")

    return f"""{SYSTEM_IDENTITY}

══ إحصائيات قاعدة البيانات ══
{db_summary}

══ تفاصيل الإشارات ذات الصلة ══
{db_detail}
{freq_block}{rag_block}
══ السؤال ══
{intent.raw}

══ تعليمة التحليل ══
{guidance}

الوقت: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

أجب الآن:"""


def _agent_process(question: str, top_k: int = 4) -> dict:
    intent     = detect_intent(question)
    signals    = _read_db(limit=150)
    db_summary = _db_summary(signals)
    db_detail  = _db_recent(
        signals, n=12,
        label_filter   = intent.label,
        station_filter = STATIONS.get(intent.location or "", None),
        freq_filter    = intent.freq,
    )
    freq_info = classify_freq(intent.freq) if intent.freq else None
    rag_ctx   = _rag_query(question, top_k=top_k)
    prompt    = _make_prompt(intent, db_summary, db_detail, rag_ctx, freq_info)
    raw       = _ollama(prompt)
    answer    = _strip_markdown(raw)

    return {
        "answer":           answer,
        "sources":          [],
        "used_cache":       False,
        "used_fallback":    False,
        "report_markdown":  None,
        "intent":           intent.kind,
        "signals_analyzed": len(signals),
        "freq_info":        freq_info,
        "filters_applied": {
            "label":    intent.label,
            "location": intent.location,
            "freq_mhz": intent.freq,
        },
        "model": OLLAMA_MODEL,
    }


# ─────────────────────────────────────────────
# REPORT BUILDER
# ─────────────────────────────────────────────

def _build_ai_report(payload, signals: list[dict], freq_info: dict) -> str:
    now  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    freq = payload.frequency_mhz

    station_display = _resolve_location(payload.location, payload.source)

    similar = [
        s for s in signals
        if s.get("label", "").lower() == payload.label.lower()
        and _same_band(s, freq, tolerance=200.0)
    ]
    if not similar:
        similar = [
            s for s in signals
            if s.get("label", "").lower() == payload.label.lower()
        ]

    all_label_counts: dict[str, int] = {}
    for s in signals:
        lb = s.get("label", "Unknown")
        all_label_counts[lb] = all_label_counts.get(lb, 0) + 1

    similar_freqs: list[float] = []
    similar_snrs:  list[float] = []
    similar_confs: list[float] = []
    for s in similar[:20]:
        f = _get_freq(s)
        n = _get_snr(s)
        c = s.get("confidence", 0)
        try: similar_freqs.append(float(f))
        except: pass
        try: similar_snrs.append(float(n))
        except: pass
        try: similar_confs.append(float(c) * 100)
        except: pass

    freq_stats = ""
    if similar_freqs:
        freq_stats = (
            f"تردد: min={min(similar_freqs):.1f} / avg={sum(similar_freqs)/len(similar_freqs):.1f}"
            f" / max={max(similar_freqs):.1f} MHz"
        )
    snr_stats = ""
    if similar_snrs:
        snr_stats = (
            f"SNR: min={min(similar_snrs):.1f} / avg={sum(similar_snrs)/len(similar_snrs):.1f}"
            f" / max={max(similar_snrs):.1f} dB"
        )
    conf_stats = ""
    if similar_confs:
        conf_stats = (
            f"ثقة: min={min(similar_confs):.1f}% / avg={sum(similar_confs)/len(similar_confs):.1f}%"
            f" / max={max(similar_confs):.1f}%"
        )

    recent_rows = []
    for s in similar[:8]:
        f_str = _get_freq(s)
        sta   = _get_station(s)
        dirn  = _get_direction(s)
        strg  = _get_strength(s)
        snr   = _get_snr(s)
        conf  = float(s.get("confidence", 0))
        ts    = str(s.get("timestamp", ""))[:16]
        recent_rows.append(
            f"| {ts} | {conf:.0%} | {f_str} MHz | {snr} dB | {sta} | {dirn} | {strg} |"
        )

    recent_table  = "\n".join(recent_rows) if recent_rows else "| لا توجد بيانات سابقة | — | — | — | — | — | — |"
    db_stats_line = " | ".join(f"{k}: {v}" for k, v in all_label_counts.items())
    threat_ar     = THREAT_AR.get(freq_info.get("threat", "medium"), "⚠️ متوسط")

    band_note = ""
    if freq and not any(_same_band(s, freq, 200.0) for s in similar[:1]):
        band_note = (
            f"\nملاحظة: لا توجد إشارات {payload.label} سابقة في نفس النطاق "
            f"({freq} MHz ± 200)، البيانات التاريخية من نطاقات مختلفة."
        )

    avg_conf_str = (
        f"{sum(similar_confs)/len(similar_confs):.1f}%"
        if similar_confs else "غير متاح"
    )

    prompt = f"""{SYSTEM_IDENTITY}

اكتب تقرير تحليل RF احترافي كامل بصيغة Markdown للإشارة التالية.
التقرير يجب أن يكون فريداً بناءً على البيانات الفعلية المقدمة لك.

═══════════════════════════════════════
بيانات الإشارة الحالية:
═══════════════════════════════════════
النوع         : {payload.label}
مستوى الثقة   : {payload.confidence:.1%}
التردد        : {freq or 'غير محدد'} MHz
النطاق        : {freq_info.get('name_ar', '—')} ({freq_info.get('name_en', '—')})
مستوى الخطورة : {threat_ar}
تفسير النطاق  : {freq_info.get('explanation', '—')}
SNR           : {payload.snr_db or 'غير محدد'} dB
المصدر        : {payload.source or 'غير محدد'}
الموقع / المحطة: {station_display}
{"ملاحظات المحلل: " + payload.analyst_notes if payload.analyst_notes else ""}

═══════════════════════════════════════
إحصائيات قاعدة البيانات (إجمالي {len(signals)} إشارة):
═══════════════════════════════════════
توزيع الأنواع : {db_stats_line}
إشارات {payload.label} في نفس النطاق بـ DB: {len(similar)} إشارة
{freq_stats}
{snr_stats}
{conf_stats}
{band_note}

═══════════════════════════════════════
آخر إشارات {payload.label} في نفس النطاق:
═══════════════════════════════════════
| الوقت | الثقة | التردد | SNR | المحطة | الاتجاه | القوة |
|-------|-------|--------|-----|--------|---------|-------|
{recent_table}

═══════════════════════════════════════
المطلوب منك:
═══════════════════════════════════════
اكتب تقرير Markdown كامل يحتوي على:

# 📡 تقرير تحليل إشارة RF — SADAR
(اذكر التاريخ {now} والنوع والتردد في العنوان)

## 🔍 ملخص تنفيذي
(جملتان تلخصان الإشارة والتهديد)

## 📊 تحليل الإشارة
(اشرح التردد {freq} MHz بالتفصيل: ما هو؟ من يستخدمه؟ لماذا هو {threat_ar}؟)
(قارن مع الإشارات التاريخية في نفس النطاق — استخدم الأرقام الفعلية)

## 📈 مقارنة مع السجل التاريخي
(قارن الإشارة الحالية بالمتوسطات الحقيقية من نفس النطاق فقط)
(هل الثقة {payload.confidence:.1%} أعلى أو أقل من متوسط {avg_conf_str}؟)
(هل التردد {freq} MHz ضمن النطاق الطبيعي للنوع {payload.label}؟)

## ⚠️ تقييم التهديد
(بناءً على البيانات الفعلية — ما مستوى الخطورة ولماذا؟)

## 🎯 التوصيات الفورية
(3-5 خطوات محددة وقابلة للتنفيذ للفريق الأمني في {station_display})

## 📋 البيانات الفنية
(جدول بالمعاملات التقنية الكاملة للإشارة — اذكر المحطة: {station_display})

---
*تقرير آلي — منظومة SADAR | {now}*

مهم جداً:
- استخدم الأرقام الحقيقية من البيانات أعلاه
- استخدم اسم المحطة الحقيقي "{station_display}" في التقرير
- لا تكرر نفس الجمل
- اكتب بالعربية الواضحة مع المصطلحات التقنية بالإنجليزي حيث مناسب"""

    return prompt


# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str  = Field(..., min_length=2, max_length=600)
    top_k:    int  = Field(4, ge=1, le=10)
    refresh:  bool = Field(False)


class AskResponse(BaseModel):
    answer:           str
    sources:          list[str] = []
    used_cache:       bool = False
    used_fallback:    bool = False
    report_markdown:  str | None = None
    intent:           str
    signals_analyzed: int
    freq_info:        dict | None = None
    filters_applied:  dict
    model:            str


class FreqRequest(BaseModel):
    frequency_mhz: float = Field(..., ge=1, le=8000)


class SignalRequest(BaseModel):
    label:         str
    confidence:    float = Field(..., ge=0, le=1)
    frequency_mhz: float | None = None
    station:       str = "Unknown"
    direction:     str | None = None
    strength:      float | None = None
    snr_db:        float | None = None


class ReportRequest(BaseModel):
    label:         str   = Field(..., examples=["Drone", "Jamming", "Normal"])
    confidence:    float = Field(..., ge=0.0, le=1.0)
    frequency_mhz: float | None = Field(None, ge=0.0)
    snr_db:        float | None = None
    source:        str = "SDR"
    location:      str = "Unknown"
    analyst_notes: str = ""


class ReportResponse(BaseModel):
    markdown: str


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/health")
async def health() -> dict:
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=3)
        ollama_ok = r.status_code == 200
        models    = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        ollama_ok = False
        models    = []
    return {
        "status":       "ok",
        "ollama":       {"ok": ollama_ok, "model": OLLAMA_MODEL, "models": models},
        "model":        OLLAMA_MODEL,
        "model_loaded": any("command-r7b" in m.lower() for m in models),
        "version":      "4.4",
    }


@router.post("/ask", response_model=AskResponse)
async def ask(payload: AskRequest) -> AskResponse:
    try:
        result = await asyncio.wait_for(
            run_in_threadpool(_agent_process, payload.question, payload.top_k),
            timeout=160.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(504, "⏱️ الموديل استغرق وقتاً طويلاً — حاول مرة أخرى")
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        log.exception("Agent error")
        raise HTTPException(500, f"خطأ داخلي: {e}")
    return AskResponse(**result)


@router.post("/report", response_model=ReportResponse)
async def generate_report(payload: ReportRequest) -> ReportResponse:
    signals   = await run_in_threadpool(_read_db, 150)
    freq_info = classify_freq(payload.frequency_mhz)

    full_prompt = _build_ai_report(payload, signals, freq_info)

    try:
        report_options = {
            **OLLAMA_OPTIONS,
            "temperature": 0.2,
            "num_predict": 1500,
        }
        markdown = await asyncio.wait_for(
            run_in_threadpool(_ollama, full_prompt, 120, report_options),
            timeout=130.0,
        )
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except asyncio.TimeoutError:
        raise HTTPException(504, "انتهى وقت إنشاء التقرير — حاول مرة أخرى")
    except Exception as e:
        raise HTTPException(500, f"فشل إنشاء التقرير: {e}")

    if not markdown.startswith("#"):
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        markdown = f"# 📡 تقرير تحليل إشارة RF — {payload.label} | {now}\n\n" + markdown

    return ReportResponse(markdown=markdown)


@router.post("/explain-frequency")
async def explain_frequency(payload: FreqRequest) -> dict:
    freq_info = classify_freq(payload.frequency_mhz)
    prompt = f"""{SYSTEM_IDENTITY}

اشرح التردد التالي:
التردد   : {payload.frequency_mhz} MHz
النطاق   : {freq_info['name_ar']} ({freq_info['name_en']})
الخطورة  : {THREAT_AR.get(freq_info['threat'])}
التفسير  : {freq_info['explanation']}

اشرح في 3-5 جمل: ما هذا التردد؟ من يستخدمه؟ ما الذي يجب فعله لو رُصد؟"""

    try:
        explanation = await asyncio.wait_for(
            run_in_threadpool(_ollama, prompt, 90), timeout=100.0)
    except Exception as e:
        raise HTTPException(503, str(e))

    return {
        "frequency_mhz": payload.frequency_mhz,
        "band":          freq_info,
        "threat_level":  THREAT_AR.get(freq_info["threat"]),
        "explanation":   explanation,
    }


@router.post("/analyze-signal")
async def analyze_signal(payload: SignalRequest) -> dict:
    freq_info = classify_freq(payload.frequency_mhz) if payload.frequency_mhz else {}
    signals   = _read_db(50)
    drone_n   = sum(1 for s in signals if s.get("label") == "Drone")

    prompt = f"""{SYSTEM_IDENTITY}

رُصدت إشارة جديدة — حلّلها في جملتين:
النوع={payload.label} | الثقة={payload.confidence:.0%} | التردد={payload.frequency_mhz or '?'} MHz
النطاق: {freq_info.get('name_ar','—')} | الخطورة: {THREAT_AR.get(freq_info.get('threat','medium'))}
المحطة={payload.station} | الاتجاه={payload.direction or '?'} | SNR={payload.snr_db or '?'}dB
السياق: {drone_n} إشارة drone في النظام"""

    try:
        analysis = await asyncio.wait_for(
            run_in_threadpool(_ollama, prompt, 90), timeout=100.0)
    except Exception as e:
        raise HTTPException(503, str(e))

    return {
        "label":         payload.label,
        "frequency_mhz": payload.frequency_mhz,
        "freq_info":     freq_info,
        "threat_level":  THREAT_AR.get(freq_info.get("threat", "medium")),
        "analysis":      analysis,
        "model":         OLLAMA_MODEL,
    }


@router.get("/threat-summary")
async def threat_summary() -> dict:
    signals      = await run_in_threadpool(_read_db, 200)
    label_cnt:   dict[str, int] = {}
    station_cnt: dict[str, int] = {}
    high_threats: list[dict]    = []

    for s in signals:
        lb  = s.get("label", "Unknown")
        st  = _get_station(s)
        frq = _get_freq(s)
        cf  = s.get("confidence", 0)
        label_cnt[lb]   = label_cnt.get(lb, 0) + 1
        station_cnt[st] = station_cnt.get(st, 0) + 1
        if lb in ("Drone", "Jamming") and frq != "?" and float(cf) > 0.3:
            fi = classify_freq(float(frq))
            if THREAT_PRIORITY.get(fi["threat"], 0) >= 3:
                high_threats.append({
                    "label":     lb,
                    "freq":      frq,
                    "station":   _get_station(s),
                    "direction": _get_direction(s),
                    "strength":  _get_strength(s),
                    "conf":      float(cf),
                    "threat":    fi["threat"],
                    "band":      fi["name_ar"],
                    "desc":      fi["explanation"],
                    "ts":        str(s.get("timestamp", ""))[:19],
                })

    overall = (
        "critical" if any(h["threat"] == "critical" for h in high_threats)
        else "high" if high_threats
        else "low"
    )

    return {
        "total_signals":     len(signals),
        "label_breakdown":   label_cnt,
        "by_station":        station_cnt,
        "high_threats":      high_threats[:10],
        "overall_threat":    overall,
        "overall_threat_ar": THREAT_AR.get(overall),
        "timestamp":         datetime.now().isoformat(),
    }


@router.get("/frequency-db")
async def frequency_database() -> dict:
    return {
        "total": len(FREQ_DB),
        "bands": [
            {"range_mhz": f"{lo}-{hi}", "name_ar": nar, "name_en": nen,
             "threat": thr, "threat_ar": THREAT_AR[thr], "desc": desc}
            for lo, hi, nar, nen, thr, desc in FREQ_DB
        ],
        "stations":      STATIONS,
        "threat_levels": THREAT_AR,
    }


@router.post("/knowledge-base/rebuild")
async def rebuild_knowledge_base() -> dict:
    return {"status": "ok", "message": "Knowledge base rebuild not applicable in this version"}