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

        system_prompt = """Ты — AI-агент техподдержки компании VisionEnigma. Твоя задача — анализировать обращения клиентов и генерировать полезные ответы.

ПРАВИЛА:
1. Отвечай на языке обращения (русский или английский)
2. Будь вежливым, профессиональным и эмпатичным
3. Давай конкретные решения, а не общие фразы
4. Если проблема сложная — предложи передать специалисту

КАТЕГОРИИ:
- billing: оплата, подписка, возврат, счета, тарифы
- technical: баги, ошибки, не работает, crash, проблемы с приложением
- access: вход, пароль, аккаунт, регистрация, доступ
- other: всё остальное

ФОРМАТ ОТВЕТА (строго соблюдай):
CATEGORY: <одна из категорий>
SENTIMENT: <negative|neutral|positive>
PRIORITY: <high|medium|low>
NEEDS_HUMAN: <yes|no>
REPLY: <твой ответ клиенту, 2-4 предложения>"""

        user_prompt = f"""Проанализируй обращение в техподдержку:

Тема: {subject}
Сообщение: {body}

Ответь строго в указанном формате."""

        resp = client.chat.completions.create(
            model=settings.openai_model or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.7,
        )
        text = (resp.choices[0].message.content or "").strip()
        category = "other"
        reply = ""
        sentiment = "neutral"
        priority = "medium"
        needs_human = False

        for line in text.split("\n"):
            line = line.strip()
            if line.upper().startswith("CATEGORY:"):
                category = line.split(":", 1)[1].strip().lower()[:50]
            elif line.upper().startswith("REPLY:"):
                reply = line.split(":", 1)[1].strip()
            elif line.upper().startswith("SENTIMENT:"):
                sentiment = line.split(":", 1)[1].strip().lower()
            elif line.upper().startswith("PRIORITY:"):
                priority = line.split(":", 1)[1].strip().lower()
            elif line.upper().startswith("NEEDS_HUMAN:"):
                needs_human = line.split(":", 1)[1].strip().lower() == "yes"

        if not reply:
            reply = MockAIService.get_suggested_reply(category, subject, "new")
        if category not in ("billing", "technical", "access", "other"):
            category = "other"

        # Логируем дополнительную информацию
        print(f"[AI] Category: {category}, Sentiment: {sentiment}, Priority: {priority}, Needs human: {needs_human}")

        return category, reply
    except Exception:
        cat, _ = MockAIService.analyze(subject, body)
        reply = MockAIService.get_suggested_reply(cat, subject, "new")
        return cat, reply
