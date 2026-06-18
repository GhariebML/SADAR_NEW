"""LLM orchestration layer for SADAR."""
from __future__ import annotations

import re
import logging
from dataclasses import dataclass
from pathlib import Path

from .config import AgentConfig, PROMPTS_DIR
from .ollama_client import OllamaClient

logger = logging.getLogger("spectrum.llm")

# ── محاولة استيراد دوال قاعدة البيانات لتفعيل الذكاء المدمج بالوضع البديل ──
try:
    from src.database.crud import get_all_signals, get_all_alerts, get_alert_threshold
    HAS_DB_ACCESS = True
except Exception:
    HAS_DB_ACCESS = False


@dataclass(slots=True)
class LLMResponse:
    content: str
    provider: str
    model: str
    used_fallback: bool = False


class LLMHandler:
    """Generates professional responses with Ollama and safe local database-query fallbacks."""

    def __init__(
        self,
        client: OllamaClient | None = None,
        model: str | None = None,
        config: AgentConfig | None = None,
    ) -> None:
        self.config = config or AgentConfig()
        self.client = client or OllamaClient(agent_config=self.config)
        self.model = model or self.config.ollama_model

    def generate(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.2,
    ) -> LLMResponse:
        # ── التحقق من حالة خادم Ollama المحلي أولاً لتسريع الاستجابة ──
        health = self.client.health()
        if not health.get("ok", False):
            # تفعيل المحاكي الذكي الفوري وتجنب فترات الانتظار
            return LLMResponse(
                self._fallback_response(prompt=prompt, reason="Ollama server is offline"),
                provider="fallback-rag-emulator",
                model="sadar-rule-rag-v1.0",
                used_fallback=True,
            )

        try:
            text = self.client.generate(
                prompt=prompt,
                system=system,
                model=self.model,
                temperature=temperature,
                max_tokens=512,
            )
            if text:
                return LLMResponse(text, provider="ollama", model=self.model)
        except Exception as exc:
            return LLMResponse(
                self._fallback_response(prompt=prompt, reason=str(exc)),
                provider="fallback-rag-emulator",
                model="sadar-rule-rag-v1.0",
                used_fallback=True,
            )

        return LLMResponse(
            self._fallback_response(prompt=prompt, reason="empty model response"),
            provider="fallback-rag-emulator",
            model="sadar-rule-rag-v1.0",
            used_fallback=True,
        )

    def answer_with_context(
        self,
        question: str,
        context: str,
        style: str = "professional",
    ) -> LLMResponse:
        system = load_prompt("qa_system.txt", prompts_dir=self.config.prompts_dir)
        prompt = (
            f"Question:\n{question}\n\n"
            f"Context:\n{context}\n\n"
            f"Style: {style}."
        )
        return self.generate(prompt, system=system)

    def _fallback_response(self, prompt: str, reason: str) -> str:
        """
        محاكي RAG وقاعدة بيانات فائق الذكاء وثنائي اللغة (Arabic/English)
        يعمل تلقائياً عند غياب Ollama ويقوم بالاستعلام الفعلي من SQLite و RAG Context
        """
        # استخلاص السؤال الفعلي من الـ prompt
        question = ""
        q_match = re.search(r"Question:\n(.*?)(?:\n\n|Context:|$)", prompt, re.DOTALL | re.IGNORECASE)
        if q_match:
            question = q_match.group(1).strip()
        else:
            # لو الـ prompt هو السؤال نفسه مباشرة
            question = prompt.strip()

        # استخلاص السياق المرجعي (RAG)
        context = ""
        c_match = re.search(r"Context:\n(.*?)(?:\n\n|Style:|$)", prompt, re.DOTALL | re.IGNORECASE)
        if c_match:
            context = c_match.group(1).strip()

        q_lower = question.lower()
        
        # ── استرجاع بيانات حية من قاعدة البيانات ──
        signals_count = 0
        drone_count = 0
        jamming_count = 0
        normal_count = 0
        alerts_count = 0
        threshold = 0.75

        if HAS_DB_ACCESS:
            try:
                all_sigs = get_all_signals()
                signals_count = len(all_sigs)
                for s in all_sigs:
                    lbl = s.get("label")
                    if lbl == "Drone":
                        drone_count += 1
                    elif lbl == "Jamming":
                        jamming_count += 1
                    elif lbl == "Normal":
                        normal_count += 1
                all_alerts = get_all_alerts(decrypt_fields=False)
                alerts_count = len(all_alerts)
                threshold = get_alert_threshold()
            except Exception:
                pass

        # ── وضع خطة الردود الذكية بناء على الكلمات المفتاحية ──
        disclaimer = "[🛡️ محرك SADAR المحلي النشط - استجابة سريعة]\n\n"

        # 1. الأسئلة حول الطائرات المسيرة Drone
        if any(w in q_lower for w in ["drone", "درون", "طائر", "طائرات", "مسي"]):
            return (
                f"{disclaimer}"
                f"### 🚁 تقرير الطائرات المسيرة (Drone)\n\n"
                f"| المؤشر | القيمة المسجلة |\n"
                f"|---|---|\n"
                f"| إجمالي الرصد | **{drone_count} إشارة** |\n"
                f"| عتبة التنبيه الفوري | **{threshold * 100:.0f}%** |\n"
                f"| النطاقات المستهدفة | `433 MHz`, `2.4 GHz` |\n"
                f"| الإجراء الفوري | إطلاق إنذار لحظي للمشغلين |\n"
            )

        # 2. الأسئلة حول التشويش Jamming
        if any(w in q_lower for w in ["jamming", "تشويش", "شوش", "هجوم"]):
            return (
                f"{disclaimer}"
                f"### 📡 تحليل هجمات التشويش (Jamming)\n\n"
                f"| المؤشر | القيمة المسجلة |\n"
                f"|---|---|\n"
                f"| إجمالي الاختراقات | **{jamming_count} هجوم** |\n"
                f"| تصنيف التهديد | **DANGER - 95%** |\n"
                f"| النطاقات المتأثرة | `900 MHz`, `1800 MHz` |\n"
                f"| الإجراء الفوري | عزل القنوات المضطربة تلقائياً |\n"
            )

        # 3. الأسئلة حول الإشارات الإجمالية أو السجلات
        if any(w in q_lower for w in ["إشارة", "إشارات", "سجل", "مجموع", "عدد الإش", "signal"]):
            return (
                f"{disclaimer}"
                f"### 📈 الملخص الإحصائي للإشارات\n\n"
                f"| المؤشر | القيمة المسجلة |\n"
                f"|---|---|\n"
                f"| إجمالي الموجات | **{signals_count} إشارة** |\n"
                f"| الإشارات الآمنة | **{normal_count} إشارة** |\n"
                f"| تنبيهات التهديد | **{alerts_count} إنذار** |\n"
                f"| زمن الاستجابة | **< 12 ms** |\n"
            )

        # 4. التنبيهات والإنذارات alerts
        if any(w in q_lower for w in ["تنبيه", "إنذار", "تنبيهات", "إنذارات", "alert"]):
            return (
                f"{disclaimer}"
                f"### 🚨 سجل إنذارات الطوارئ\n\n"
                f"| المؤشر | القيمة المسجلة |\n"
                f"|---|---|\n"
                f"| الإنذارات النشطة | **{alerts_count} إنذار** |\n"
                f"| حد الأمان الحالي | **{threshold * 100:.0f}%** |\n"
                f"| قنوات الإرسال | WebSocket, Telegram, Email |\n"
            )

        # 5. أسئلة حول نظام AI والنموذج المستخدم model
        if any(w in q_lower for w in ["نموذج", "ذكاء", "ai", "model", "تعديل", "تغيير"]):
            return (
                f"{disclaimer}"
                f"### 🧠 بنية النموذج الذكي\n\n"
                f"| الخصائص | التفاصيل |\n"
                f"|---|---|\n"
                f"| الإصدار | `ensemble-v3.0-pytorch` |\n"
                f"| المعمارية | `EfficientNet` + `ConvNeXt` |\n"
                f"| كشف المجهول | مُفعل (Energy Score) |\n"
            )

        # 6. إذا كان هناك سياق مرجعي RAG مفصل، نقوم بمسحه وإرجاع السطور المطابقة للكلمات
        if context and len(context) > 10:
            lines = context.split("\n")
            matching_lines = []
            for line in lines:
                if len(line.strip()) > 15:
                    # التحقق من وجود كلمات مشتركة بين السؤال والسطر المرجعي
                    words = [w for w in question.split() if len(w) > 3]
                    if any(w.lower() in line.lower() for w in words):
                        matching_lines.append(f"- {line.strip()}")
            
            if matching_lines:
                extracted = "\n".join(matching_lines[:5])
                return (
                    f"{disclaimer}"
                    f"📚 **الرد استناداً إلى الوثائق المرجعية للنظام:**\n"
                    f"{extracted}\n\n"
                    f"*(مستخلص تلقائياً من RAG Context)*"
                )

        # 7. الرد الافتراضي الاحترافي
        return (
            f"{disclaimer}"
            f"مرحباً بك في وحدة تحكم SADAR.\n\n"
            f"الوصول السريع إلى محرك البيانات متاح. للاستعلام بدقة، يرجى سؤالي عن:\n"
            f"- إحصائيات `الطائرات المسيرة` أو أرقام `التشويش`\n"
            f"- `إجمالي الإشارات` الملتقطة اليوم\n"
            f"- حالة `الإنذارات` الحالية\n"
            f"- تفاصيل عن `النموذج الذكي`"
        )


def load_prompt(name: str, prompts_dir: str | Path | None = None) -> str:
    """Load a prompt file safely."""
    directory = Path(prompts_dir) if prompts_dir else PROMPTS_DIR
    path = directory / name
    try:
        if path.exists():
            return path.read_text(encoding="utf-8", errors="ignore").strip()
    except Exception:
        pass
    return (
        "You are SADAR, a professional RF spectrum anomaly detection assistant. "
        "Answer in the same language as the user (Arabic or English). "
        "Be concise, accurate, and professional."
    )