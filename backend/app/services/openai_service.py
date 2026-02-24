"""
OpenAI ile ticket analizi: kategori + önerilen cevap.
API key yoksa MockAIService kullanılır.
"""
from typing import Tuple
from app.config import get_settings
from app.services.mock_ai import MockAIService


def analyze_with_openai(subject: str, body: str) -> Tuple[str, str]:
    """
    OpenAI ile analiz: (kategori, önerilen_cevap).
    Hata veya key yoksa mock döner.
    """
    settings = get_settings()
    if not (settings.openai_api_key and settings.openai_api_key.strip()):
        cat, _ = MockAIService.analyze(subject, body)
        reply = MockAIService.get_suggested_reply(cat, subject, "new")
        return cat, reply

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key.strip())
        prompt = f"""Aşağıdaki destek talebini incele.

Konu: {subject}
Mesaj: {body}

İki şey döndür (sadece bu formatta, başka metin yok):
CATEGORY: billing|technical|access|other
REPLY: Müşteriye Türkçe veya Rusça kısa, nazik bir yanıt öner (1-3 cümle)."""

        resp = client.chat.completions.create(
            model=settings.openai_model or "gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
        )
        text = (resp.choices[0].message.content or "").strip()
        category = "other"
        reply = ""
        for line in text.split("\n"):
            line = line.strip()
            if line.upper().startswith("CATEGORY:"):
                category = line.split(":", 1)[1].strip().lower()[:50]
            elif line.upper().startswith("REPLY:"):
                reply = line.split(":", 1)[1].strip()

        if not reply:
            reply = MockAIService.get_suggested_reply(category, subject, "new")
        if category not in ("billing", "technical", "access", "other"):
            category = "other"
        return category, reply
    except Exception:
        cat, _ = MockAIService.analyze(subject, body)
        reply = MockAIService.get_suggested_reply(cat, subject, "new")
        return cat, reply
