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
    operator_required: bool = False
    operator_reason: Optional[str] = None


# 20 категорий запросов (whitelist). AI обязан выбрать одну. "другое" — только если ни одна не подходит.
ALLOWED_CATEGORIES = [
    "неисправность",
    "калибровка",
    "запрос_документации",
    "гарантия",
    "замена_датчика",
    "консультация",
    "экзамен",
    "пересдача",
    "оплата",
    "договор",
    "возврат",
    "жалоба",
    "срочный_вызов",
    "монтаж",
    "поставка",
    "обучение",
    "сертификация",
    "ремонт",
    "апгрейд",
    "другое",
]
CATEGORY_LABELS_RU = {
    "неисправность": "Неисправность",
    "калибровка": "Калибровка",
    "запрос_документации": "Запрос документации",
    "гарантия": "Гарантия",
    "замена_датчика": "Замена датчика",
    "консультация": "Консультация",
    "экзамен": "Экзамен / аттестация",
    "пересдача": "Пересдача",
    "оплата": "Оплата / счёт",
    "договор": "Договор",
    "возврат": "Возврат",
    "жалоба": "Жалоба",
    "срочный_вызов": "Срочный вызов",
    "монтаж": "Монтаж / установка",
    "поставка": "Поставка / доставка",
    "обучение": "Обучение",
    "сертификация": "Сертификация",
    "ремонт": "Ремонт",
    "апгрейд": "Апгрейд / модернизация",
    "другое": "Другое",
}
# Обратная совместимость
ERIS_CATEGORIES = ALLOWED_CATEGORIES

# Ключевые слова срочности/криза: при наличии в теме или теле — operator_required = true (heuristic override)
URGENT_KEYWORDS = [
    "срочно", "срочная", "срочный", "немедленно", "asap", "экстренно", "сегодня", "прямо сейчас",
    "критично", "критическая", "авария", "аварийн", "простой", "опасно", "опасность",
    "угроза", "утечка", "взлом", "мошенничество", "жалоба", "суд", "прокуратура",
    "оплата", "счет", "счёт", "возврат", "доступ", "аккаунт", "заблокировали", "не могу войти",
    "перезвоните", "нужен человек", "нужен оператор", "требуется оператор",
    "живой оператор", "срочно перезвоните", "срочно свяжитесь",
]

DEFAULT_OPERATOR_REASON = "Запрос помечен как срочный — требуется вмешательство оператора."


def _apply_operator_heuristic(subject: str, body: str, result: ErisAnalysisResult) -> None:
    """Если в теме или теле есть ключевые слова срочности — принудительно operator_required = true."""
    text = f"{subject or ''} {body or ''}".lower()
    for kw in URGENT_KEYWORDS:
        if kw in text:
            result.operator_required = True
            result.operator_reason = (result.operator_reason or DEFAULT_OPERATOR_REASON)[:120]
            return


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
        raise ValueError(
            "OPENAI_API_KEY bulunamadı. Proje kökündeki .env dosyasını oluşturun; .env.example dosyasından kopyalayıp anahtarınızı yazın."
        )

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

КАТЕГОРИИ ЗАПРОСОВ (выбери РОВНО ОДНУ из списка; "другое" — только если ни одна не подходит):
1. неисправность — прибор не работает, ошибки, неверные показания
2. калибровка — калибровка, поверка, настройка
3. запрос_документации — паспорт, сертификат, руководство, методика
4. гарантия — гарантийный ремонт, замена по гарантии
5. замена_датчика — замена сенсора, чувствительного элемента
6. консультация — вопросы по эксплуатации, выбору оборудования
7. экзамен — экзамен, аттестация, проверка знаний
8. пересдача — пересдача экзамена, повторная аттестация
9. оплата — оплата, счёт, выставление счёта
10. договор — договор, условия, допсоглашение
11. возврат — возврат товара, денег
12. жалоба — жалоба на сотрудника, сервис
13. срочный_вызов — срочный выезд, срочная заявка
14. монтаж — монтаж, установка, шеф-монтаж
15. поставка — поставка, доставка, сроки
16. обучение — обучение, инструктаж
17. сертификация — сертификация, декларации
18. ремонт — ремонт (вне гарантии)
19. апгрейд — апгрейд, модернизация
20. другое — только если ни одна категория выше не подходит

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
  "category": "строго одна из 20 категорий выше (только slug: неисправность, калибровка, запрос_документации, гарантия, замена_датчика, консультация, экзамен, пересдача, оплата, договор, возврат, жалоба, срочный_вызов, монтаж, поставка, обучение, сертификация, ремонт, апгрейд, другое)",
  "issue_summary": "Краткое описание проблемы в 1-2 предложения",
  "reply": "Твой ответ клиенту 2-4 предложения. Вежливый, профессиональный. Если есть решение из базы знаний — используй его. Если нужна дополнительная информация — запроси. Если требуется выезд специалиста — предложи оформить заявку.",
  "operator_required": true или false,
  "operator_reason": "Одна короткая фраза на русском (макс. 120 символов), почему нужен оператор, или null если operator_required false"
}}

ОПЕРАТОР ТРЕБУЕТСЯ (operator_required = true) — ОБЯЗАТЕЛЬНО ставь true, если в письме есть хотя бы одно:
A) Академия/срочность: срочно, срочная, немедленно, ASAP, экстренно, сегодня, прямо сейчас, критично, авария, простой, опасно.
B) Безопасность/риск/жалоба: угроза, опасность, утечка, взлом, мошенничество, жалоба, суд, прокуратура.
C) Оплата/доступ: оплата, счёт, возврат, доступ, аккаунт, заблокировали, не могу войти.
D) Прямой запрос человека: перезвоните, нужен человек, нужен оператор, требуется оператор, живой оператор, срочно перезвоните.
E) Срочность + экзамен/пересдача/сертификат/обучение: если в тексте есть «срочно» или «сегодня» или «сроки» вместе с экзамен/пересдача/сертификат/обучение — всегда true.

operator_required = false только если: простой информационный вопрос, нет срочности, нет риска, нет просьбы перезвонить/оператора.
operator_reason — одно предложение на русском, макс. 120 символов."""

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

        # Валидация категории по whitelist
        raw = (data.get("category") or "другое").strip().lower().replace(" ", "_")
        category = raw if raw in ALLOWED_CATEGORIES else "другое"

        # Валидация sentiment
        sentiment = data.get("sentiment", "neutral").lower()
        if sentiment not in ("positive", "neutral", "negative"):
            sentiment = "neutral"

        # Оператор требуется
        op_req = data.get("operator_required") in (True, "true", 1, "1")
        op_reason = data.get("operator_reason")
        if isinstance(op_reason, str):
            op_reason = op_reason.strip() or None
        else:
            op_reason = None

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
            category=_map_to_legacy_category(category),
            operator_required=op_req,
            operator_reason=op_reason,
        )
        _apply_operator_heuristic(subject, body, result)

        print(f"[AI ЭРИС] Категория: {category}, Тональность: {sentiment}")
        print(f"[AI ЭРИС] ФИО: {result.sender_full_name}, Организация: {result.object_name}")
        print(f"[AI ЭРИС] Серийные номера: {result.serial_numbers}, Тип прибора: {result.device_type}")

        return result

    except json.JSONDecodeError as e:
        print(f"[AI ЭРИС] Ошибка парсинга JSON: {e}")
        print(f"[AI ЭРИС] Сырой ответ: {text[:500]}")
        fallback = ErisAnalysisResult(
            sentiment="neutral",
            request_category="другое",
            category="other",
            reply="Благодарим за обращение в службу поддержки ЭРИС. Ваш запрос получен и будет обработан специалистом. Мы свяжемся с вами в ближайшее время.",
            operator_required=False,
            operator_reason=None,
        )
        _apply_operator_heuristic(subject, body, fallback)
        return fallback
    except Exception as e:
        print(f"[AI ЭРИС] Ошибка: {e}")
        raise


def _map_to_legacy_category(eris_category: str) -> str:
    """Маппинг категорий на legacy"""
    technical = ("неисправность", "калибровка", "замена_датчика", "ремонт", "монтаж", "апгрейд")
    if eris_category in technical:
        return "technical"
    if eris_category in ("гарантия", "оплата", "договор", "возврат"):
        return "billing"
    return "other"
