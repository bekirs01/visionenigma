"""
OpenAI для анализа тикетов ЭРИС: извлечение данных + категоризация + генерация ответа.
"""
from typing import Tuple, Dict, Any, Optional, List
from dataclasses import dataclass
import json
from app.config import get_settings


@dataclass
class ErisAnalysisResult:
    """Результат анализа письма для кейса ЭРИС"""
    sender_full_name: Optional[str] = None
    object_name: Optional[str] = None
    sender_phone: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    device_type: Optional[str] = None
    sentiment: str = "neutral"
    request_category: str = "другое"
    issue_summary: Optional[str] = None
    reply: str = ""
    category: str = "other"  # legacy compatibility


# Категории для кейса ЭРИС
ERIS_CATEGORIES = [
    "неисправность",      # прибор не работает, ошибки
    "калибровка",         # запрос на калибровку, поверку
    "запрос_документации", # паспорт, сертификат, руководство
    "гарантия",           # гарантийные вопросы, замена
    "замена_датчика",     # замена чувствительного элемента
    "консультация",       # вопросы по эксплуатации
    "другое"              # всё остальное
]


def analyze_with_openai(subject: str, body: str, kb_context: str = "") -> Tuple[str, str]:
    """
    Legacy функция для совместимости: (категория, ответ).
    """
    result = analyze_eris_email(subject, body, "", kb_context)
    return result.category, result.reply


def analyze_eris_email(
    subject: str,
    body: str,
    sender_email: str = "",
    kb_context: str = ""
) -> ErisAnalysisResult:
    """
    Полный анализ письма для кейса ЭРИС (газоанализаторы).

    Извлекает:
    - ФИО отправителя
    - Название предприятия/объекта
    - Контактный телефон
    - Заводские номера приборов
    - Тип/модель приборов
    - Эмоциональный окрас
    - Категорию запроса
    - Краткое описание проблемы
    - Ответ на основе базы знаний
    """
    settings = get_settings()
    if not (settings.openai_api_key and settings.openai_api_key.strip()):
        raise ValueError("OpenAI API ключ не настроен. Добавьте OPENAI_API_KEY в .env")

    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key.strip())

    system_prompt = """Ты — AI-агент техподдержки компании ЭРИС (производитель газоанализаторов и газосигнализаторов).

ТВОЯ ЗАДАЧА:
Проанализировать входящее письмо от клиента и извлечь структурированные данные.

ТИПЫ ПРОДУКЦИИ ЭРИС:
- Газоанализаторы серии: ЭРИС-210, ЭРИС-230, ЭРИС-310, ЭРИС-ФИД
- Газосигнализаторы: ГСМ-05, ГСМ-10, ГС-СО
- Датчики: ДГС-ЭРИС (на разные газы: метан, СО, H2S, O2, и др.)
- Системы: СГК, СИКЗ, АСУ ТП

КАТЕГОРИИ ЗАПРОСОВ:
1. "неисправность" — прибор не работает, выдаёт ошибки, неверные показания
2. "калибровка" — запрос на калибровку, поверку, настройку
3. "запрос_документации" — нужен паспорт, сертификат, руководство, методика поверки
4. "гарантия" — гарантийные вопросы, гарантийный ремонт, замена по гарантии
5. "замена_датчика" — замена чувствительного элемента, сенсора
6. "консультация" — вопросы по эксплуатации, выбору оборудования, техническим характеристикам
7. "другое" — всё, что не попадает в другие категории

ЭМОЦИОНАЛЬНЫЙ ОКРАС:
- "negative" — клиент расстроен, жалуется, недоволен
- "neutral" — обычный деловой тон
- "positive" — благодарность, удовлетворённость

ИНСТРУКЦИИ ПО ИЗВЛЕЧЕНИЮ ДАННЫХ:
1. ФИО: ищи в подписи, приветствии ("С уважением, ...", "Иванов И.И.")
2. Организация: название предприятия, завода, объекта
3. Телефон: любой номер в тексте (+7, 8-..., и т.д.)
4. Заводские номера: обычно формат "ЗН: 12345" или "№12345", могут быть несколько
5. Тип прибора: модель газоанализатора/датчика (ЭРИС-210, ДГС-ЭРИС и т.д.)

{kb_section}

ФОРМАТ ОТВЕТА (строго JSON, без markdown):
{{
  "full_name": "ФИО или null если не найдено",
  "object_name": "Название организации или null",
  "phone": "Телефон или null",
  "serial_numbers": ["ЗН1", "ЗН2"] или [],
  "device_type": "Тип прибора или null",
  "sentiment": "negative|neutral|positive",
  "category": "одна из категорий выше",
  "issue_summary": "Краткое описание проблемы в 1-2 предложения",
  "reply": "Твой ответ клиенту 2-4 предложения. Вежливый, профессиональный. Если есть решение из базы знаний — используй его. Если нужна дополнительная информация — запроси. Если требуется выезд специалиста — предложи оформить заявку."
}}"""

    # Добавляем контекст из базы знаний если есть
    kb_section = ""
    if kb_context:
        kb_section = f"""
РЕЛЕВАНТНЫЕ СТАТЬИ ИЗ БАЗЫ ЗНАНИЙ:
{kb_context}

Используй информацию из базы знаний для формирования ответа."""

    system_prompt = system_prompt.format(kb_section=kb_section)

    user_prompt = f"""Проанализируй письмо в техподдержку ЭРИС:

От: {sender_email}
Тема: {subject}

Текст письма:
{body}

Извлеки все данные и сформируй ответ. Ответь строго в JSON формате."""

    try:
        resp = client.chat.completions.create(
            model=settings.openai_model or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=1000,
            temperature=0.3,  # Низкая температура для более точного извлечения
        )
        text = (resp.choices[0].message.content or "").strip()

        # Убираем возможные markdown обёртки
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        # Парсим JSON
        data = json.loads(text)

        # Валидация категории
        category = data.get("category", "другое").lower()
        if category not in ERIS_CATEGORIES:
            category = "другое"

        # Валидация sentiment
        sentiment = data.get("sentiment", "neutral").lower()
        if sentiment not in ("positive", "neutral", "negative"):
            sentiment = "neutral"

        # Формируем результат
        result = ErisAnalysisResult(
            sender_full_name=data.get("full_name"),
            object_name=data.get("object_name"),
            sender_phone=data.get("phone"),
            serial_numbers=data.get("serial_numbers") or [],
            device_type=data.get("device_type"),
            sentiment=sentiment,
            request_category=category,
            issue_summary=data.get("issue_summary"),
            reply=data.get("reply", ""),
            category=_map_to_legacy_category(category)
        )

        print(f"[AI ЭРИС] Категория: {category}, Тональность: {sentiment}")
        print(f"[AI ЭРИС] ФИО: {result.sender_full_name}, Организация: {result.object_name}")
        print(f"[AI ЭРИС] Серийные номера: {result.serial_numbers}, Тип прибора: {result.device_type}")

        return result

    except json.JSONDecodeError as e:
        print(f"[AI ЭРИС] Ошибка парсинга JSON: {e}")
        print(f"[AI ЭРИС] Сырой ответ: {text[:500]}")
        # Fallback: возвращаем базовый результат
        return ErisAnalysisResult(
            sentiment="neutral",
            request_category="другое",
            category="other",
            reply="Благодарим за обращение в службу поддержки ЭРИС. Ваш запрос получен и будет обработан специалистом. Мы свяжемся с вами в ближайшее время."
        )
    except Exception as e:
        print(f"[AI ЭРИС] Ошибка: {e}")
        raise


def _map_to_legacy_category(eris_category: str) -> str:
    """Маппинг категорий ЭРИС на legacy категории"""
    mapping = {
        "неисправность": "technical",
        "калибровка": "technical",
        "запрос_документации": "other",
        "гарантия": "billing",
        "замена_датчика": "technical",
        "консультация": "other",
        "другое": "other"
    }
    return mapping.get(eris_category, "other")
