"""
Единый AI-агент для кейса ЭРИС.
Объединяет поиск по базе знаний и вызов LLM.
"""
import json
from typing import Optional
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session

from app.services.kb_search import KBSearchService, get_kb_context, HistorySearchService, get_history_context
from app.services.openai_service import analyze_eris_email, ErisAnalysisResult, ALLOWED_CATEGORIES
from app.services.device_extract import extract_device_model


@dataclass
class AIAgentResult:
    """Полный результат работы AI-агента"""
    # Извлечённые данные
    sender_full_name: Optional[str] = None
    object_name: Optional[str] = None
    sender_phone: Optional[str] = None
    serial_numbers: Optional[list] = None
    device_type: Optional[str] = None

    # Анализ
    sentiment: str = "neutral"
    request_category: str = "другое"
    issue_summary: Optional[str] = None

    # Ответ
    reply: str = ""

    # Требуется оператор
    operator_required: bool = False
    operator_reason: Optional[str] = None

    # Метаданные
    kb_articles_used: int = 0
    confidence: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)


class AIAgent:
    """
    AI-агент для обработки писем техподдержки ЭРИС.

    Пайплайн:
    1. Поиск похожих обращений в истории
    2. Поиск релевантных статей в базе знаний
    3. Вызов LLM с контекстом (история + KB)
    4. Парсинг и валидация результата
    5. Возврат структурированных данных
    """

    def __init__(self, db: Session):
        self.db = db
        self.kb_service = KBSearchService(db)
        self.history_service = HistorySearchService(db)

    def process_email(
        self,
        subject: str,
        body: str,
        sender_email: str = ""
    ) -> AIAgentResult:
        """
        Обрабатывает входящее письмо.

        Args:
            subject: Тема письма
            body: Тело письма
            sender_email: Email отправителя

        Returns:
            AIAgentResult с извлечёнными данными и ответом
        """
        query = f"{subject} {body}"

        # 1. Поиск похожих обращений в истории
        history_context = self.history_service.get_history_context_for_llm(query, top_k=2)
        history_results = self.history_service.search_similar_tickets(query, top_k=2)
        history_used = len(history_results)

        if history_used > 0:
            best_match = history_results[0]
            print(f"[AI Agent] Найдено {history_used} похожих обращений в истории (лучшее: {best_match.similarity:.0%})")

        # 2. Поиск в базе знаний (статьи)
        kb_context = self.kb_service.get_context_for_llm(query, top_k=3)
        kb_results = self.kb_service.search(query, top_k=3)
        kb_articles_used = len(kb_results)

        print(f"[AI Agent] Найдено {kb_articles_used} релевантных статей в KB")

        # 3. Объединяем контекст (история приоритетнее)
        combined_context = ""
        if history_context:
            combined_context += history_context + "\n\n"
        if kb_context:
            combined_context += kb_context

        # 4. Вызов LLM с объединённым контекстом
        try:
            eris_result = analyze_eris_email(
                subject=subject,
                body=body,
                sender_email=sender_email,
                kb_context=combined_context  # История + статьи KB
            )

            # Определяем confidence на основе найденных источников
            if history_used > 0 and history_results[0].similarity >= 0.65:
                confidence = 0.90  # Высокая уверенность - есть похожее обращение
            elif kb_articles_used > 0:
                confidence = 0.80  # Средняя - есть статьи KB
            else:
                confidence = 0.60  # Базовая - только LLM

            # 5. Формируем результат
            return AIAgentResult(
                sender_full_name=eris_result.sender_full_name,
                object_name=eris_result.object_name,
                sender_phone=eris_result.sender_phone,
                serial_numbers=eris_result.serial_numbers,
                device_type=eris_result.device_type,
                sentiment=eris_result.sentiment,
                request_category=eris_result.request_category,
                issue_summary=eris_result.issue_summary,
                reply=eris_result.reply,
                operator_required=eris_result.operator_required,
                operator_reason=eris_result.operator_reason,
                kb_articles_used=kb_articles_used + history_used,
                confidence=confidence
            )

        except Exception as e:
            print(f"[AI Agent] Ошибка LLM: {e}")
            # Fallback ответ
            return AIAgentResult(
                sentiment="neutral",
                request_category="другое",
                reply=self._generate_fallback_reply(),
                kb_articles_used=kb_articles_used,
                confidence=0.3
            )

    def process_ticket(self, ticket) -> AIAgentResult:
        """
        Обрабатывает тикет из БД.

        Args:
            ticket: Объект Ticket из БД

        Returns:
            AIAgentResult
        """
        return self.process_email(
            subject=ticket.subject or "",
            body=ticket.body or "",
            sender_email=ticket.sender_email or ""
        )

    def update_ticket_with_result(self, ticket, result: AIAgentResult):
        """
        Обновляет тикет результатами анализа.

        Args:
            ticket: Объект Ticket
            result: AIAgentResult
        """
        # Formdan gelen FIO/telefon/organizasyonu koru; AI sadece boşsa doldursun
        if not (ticket.sender_full_name or "").strip() and result.sender_full_name:
            ticket.sender_full_name = result.sender_full_name
        if not (ticket.object_name or "").strip() and result.object_name:
            ticket.object_name = result.object_name
        if not (ticket.sender_phone or "").strip() and result.sender_phone:
            ticket.sender_phone = result.sender_phone
        ticket.serial_numbers = json.dumps(result.serial_numbers) if result.serial_numbers else None
        # Прибор: сначала regex по тексту, затем AI (без выдумывания)
        extracted = extract_device_model((ticket.subject or "") + "\n" + (ticket.body or ""))
        ticket.device_type = (extracted or (result.device_type or "").strip() or None)
        if ticket.device_type and len(ticket.device_type) > 60:
            ticket.device_type = ticket.device_type[:60]
        ticket.sentiment = result.sentiment
        req_cat = (result.request_category or "").strip()
        ticket.request_category = req_cat if req_cat in ALLOWED_CATEGORIES else "другое"
        ticket.issue_summary = result.issue_summary
        ticket.ai_reply = result.reply
        ticket.ai_category = self._map_category(result.request_category)
        ticket.operator_required = result.operator_required
        ticket.operator_reason = (result.operator_reason or "").strip() or None

    def _generate_fallback_reply(self) -> str:
        """Генерирует стандартный ответ при ошибке."""
        return """Благодарим за обращение в службу технической поддержки ЭРИС.

Ваш запрос получен и зарегистрирован. Наш специалист рассмотрит его в ближайшее время и свяжется с вами.

Если у вас срочный вопрос, вы можете связаться с нами по телефону горячей линии: 8 (800) 555-35-35 (бесплатно по России).

С уважением,
Служба технической поддержки ЭРИС"""

    def _map_category(self, request_category: str) -> str:
        """Маппинг категорий ЭРИС на legacy категории."""
        mapping = {
            "неисправность": "technical",
            "калибровка": "technical",
            "запрос_документации": "other",
            "гарантия": "billing",
            "замена_датчика": "technical",
            "консультация": "other",
            "другое": "other"
        }
        return mapping.get(request_category, "other")


def process_email_with_agent(
    db: Session,
    subject: str,
    body: str,
    sender_email: str = ""
) -> AIAgentResult:
    """Удобная функция для обработки письма."""
    agent = AIAgent(db)
    return agent.process_email(subject, body, sender_email)
