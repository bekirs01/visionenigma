"""
Mock AI: deterministic keyword-based categorization and template-based reply.
Future: replace with OpenAI/HuggingFace provider via same interface.
"""
import re
from typing import Tuple


# Keyword -> category mapping (deterministic for demo)
CATEGORY_KEYWORDS = {
    "billing": ["billing", "payment", "invoice", "refund", "charge", "subscription", "plan"],
    "technical": ["error", "bug", "crash", "fail", "not working", "broken", "issue", "exception"],
    "access": ["login", "password", "access", "account", "reset", "lock", "credentials"],
}


def _normalize(text: str) -> str:
    return (text or "").lower().strip()


def categorize(subject: str, body: str) -> Tuple[str, float]:
    """
    Returns (predicted_category, confidence).
    Confidence is deterministic from keyword hit count.
    """
    combined = _normalize(f"{subject} {body}")
    if not combined:
        return "other", 0.3

    best_category = "other"
    best_score = 0

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for k in keywords if k in combined)
        if score > best_score:
            best_score = score
            best_category = category

    # confidence: 0.5 base + 0.1 per keyword hit, cap at 0.95
    confidence = min(0.95, 0.5 + 0.1 * best_score) if best_score else 0.5
    return best_category, round(confidence, 2)


def suggest_reply(category: str, subject: str, status: str) -> str:
    """Template-based suggested reply."""
    templates = {
        "billing": (
            "Здравствуйте! Благодарим за обращение. Мы проверим информацию по платежу и свяжемся с вами в течение 24 часов. "
            "Номер обращения зафиксирован в нашей системе."
        ),
        "technical": (
            "Здравствуйте! Мы зафиксировали техническую проблему. Наша команда уже изучает её. "
            "Пожалуйста, уточните: на каком устройстве и в каком разделе возникает ошибка? Это ускорит решение."
        ),
        "access": (
            "Здравствуйте! По вопросу доступа к аккаунту: мы отправили инструкцию на вашу почту. "
            "Если письмо не пришло в течение 15 минут, проверьте папку «Спам» или запросите повторную отправку."
        ),
        "other": (
            "Здравствуйте! Мы получили ваше обращение. Оператор свяжется с вами в ближайшее рабочее время. "
            "Номер обращения зафиксирован."
        ),
    }
    return templates.get(category, templates["other"])


class MockAIService:
    @staticmethod
    def analyze(subject: str, body: str) -> Tuple[str, float]:
        return categorize(subject, body)

    @staticmethod
    def get_suggested_reply(category: str, subject: str, status: str) -> str:
        return suggest_reply(category, subject, status)
