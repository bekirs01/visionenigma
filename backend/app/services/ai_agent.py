"""
Единый AI-агент для кейса ЭРИС.
Объединяет поиск по базе знаний и вызов LLM.
"""
import json
from typing import Optional
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session

from app.services.kb_search import KBSearchService, get_kb_context
from app.services.openai_service import analyze_eris_email, ErisAnalysisResult


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

    # Метаданные
    kb_articles_used: int = 0
    confidence: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)


class AIAgent:
    """
    AI-агент для обработки писем техподдержки ЭРИС.

    Пайплайн:
    1. Поиск релевантных статей в базе знаний
    2. Вызов LLM с контекстом из KB
    3. Парсинг и валидация результата
    4. Возврат структурированных данных
    """

    def __init__(self, db: Session):
        self.db = db
        self.kb_service = KBSearchService(db)

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
        # 1. Поиск в базе знаний
        query = f"{subject} {body}"
        kb_context = self.kb_service.get_context_for_llm(query, top_k=3)
        kb_results = self.kb_service.search(query, top_k=3)
        kb_articles_used = len(kb_results)

        print(f"[AI Agent] Найдено {kb_articles_used} релевантных статей в KB")

        # 2. Вызов LLM
        try:
            eris_result = analyze_eris_email(
                subject=subject,
                body=body,
                sender_email=sender_email,
                kb_context=kb_context
            )

            # 3. Формируем результат
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
                kb_articles_used=kb_articles_used,
                confidence=0.85 if kb_articles_used > 0 else 0.6
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
        ticket.sender_full_name = result.sender_full_name
        ticket.object_name = result.object_name
        ticket.sender_phone = result.sender_phone
        ticket.serial_numbers = json.dumps(result.serial_numbers) if result.serial_numbers else None
        ticket.device_type = result.device_type
        ticket.sentiment = result.sentiment
        ticket.request_category = result.request_category
        ticket.issue_summary = result.issue_summary
        ticket.ai_reply = result.reply
        ticket.ai_category = self._map_category(result.request_category)

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
