import io
import csv
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Ticket, Category, AiAnalysis
from app.schemas import TicketCreate, TicketRead, TicketUpdate, AnalyzeResponse, SuggestReplyResponse
from app.repositories.ticket_repo import TicketRepository
from app.services.mock_ai import MockAIService
from app.auth import require_admin, require_admin_dep
from app.services.ai_agent import AIAgent
from app.config import get_settings

router = APIRouter(prefix="/api", tags=["tickets"])


@router.get("/tickets", response_model=List[TicketRead])
def list_tickets(
    request: Request,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    request_category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    client_token: Optional[str] = Query(None, alias="client_token"),
    x_client_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    token = client_token or x_client_token
    if require_admin(request):
        repo = TicketRepository()
        tickets = repo.get_list(db, search=search, status=status, category_id=category_id, request_category=request_category, client_token=None, limit=limit, offset=offset)
        return tickets
    if not token or not token.strip():
        raise HTTPException(status_code=400, detail="Для просмотра обращений укажите client_token (query или заголовок X-Client-Token)")
    repo = TicketRepository()
    tickets = repo.get_list(db, search=search, status=status, category_id=category_id, request_category=request_category, client_token=token.strip(), limit=limit, offset=offset)
    return tickets


@router.post("/tickets", response_model=TicketRead)
def create_ticket(data: TicketCreate, db: Session = Depends(get_db)):
    ticket = Ticket(
        sender_email=data.sender_email,
        sender_name=data.sender_name,
        subject=data.subject,
        body=data.body,
        status=data.status,
        priority=data.priority,
        category_id=data.category_id,
        source=data.source,
        client_token=(data.client_token or "").strip() or None,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Автоматический AI анализ при создании тикета
    settings = get_settings()
    has_key = bool(settings.openai_api_key)
    print(f"[AI] Тикет #{ticket.id} создан. OpenAI ключ настроен: {has_key}")
    if has_key:
        try:
            agent = AIAgent(db)
            result = agent.process_ticket(ticket)
            agent.update_ticket_with_result(ticket, result)
            db.commit()
            db.refresh(ticket)
            print(f"[AI] Автоматический анализ тикета #{ticket.id} завершён")
        except Exception as e:
            print(f"[AI] Ошибка автоматического анализа тикета #{ticket.id}: {e}")
            # Продолжаем без AI анализа - тикет уже создан

    return ticket


@router.get("/tickets/export.csv")
def export_tickets_csv(
    request: Request,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep),
):
    repo = TicketRepository()
    tickets = repo.get_list(db, search=search, status=status, category_id=category_id, client_token=None, limit=5000, offset=0)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "sender_email", "subject", "status", "priority", "category_id", "created_at"])
    for t in tickets:
        writer.writerow([t.id, t.sender_email, t.subject, t.status, t.priority, t.category_id, t.created_at])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tickets.csv"},
    )


@router.get("/tickets/{ticket_id}", response_model=TicketRead)
def get_ticket(
    ticket_id: int,
    request: Request,
    client_token: Optional[str] = Query(None),
    x_client_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not require_admin(request):
        token = (client_token or x_client_token or "").strip()
        if not token or ticket.client_token != token:
            raise HTTPException(status_code=403, detail="Нет доступа к этому обращению")
    return ticket


@router.patch("/tickets/{ticket_id}", response_model=TicketRead)
def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    request: Request,
    client_token: Optional[str] = Query(None),
    x_client_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not require_admin(request):
        token = (client_token or x_client_token or "").strip()
        if not token or ticket.client_token != token:
            raise HTTPException(status_code=403, detail="Нет доступа к этому обращению")
    if data.status is not None:
        ticket.status = data.status
    if data.priority is not None:
        ticket.priority = data.priority
    if data.category_id is not None:
        ticket.category_id = data.category_id
    if data.subject is not None:
        ticket.subject = data.subject
    if data.body is not None:
        ticket.body = data.body
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/tickets/{ticket_id}/analyze", response_model=AnalyzeResponse)
def analyze_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    predicted_category, confidence = MockAIService.analyze(ticket.subject, ticket.body)
    analysis = AiAnalysis(
        ticket_id=ticket.id,
        predicted_category=predicted_category,
        confidence=confidence,
        provider="mock",
        model_version="mock-keyword-v1",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return AnalyzeResponse(
        predicted_category=predicted_category,
        confidence=confidence,
        provider="mock",
        model_version="mock-keyword-v1",
        analysis_id=analysis.id,
    )


@router.post("/tickets/{ticket_id}/suggest-reply", response_model=SuggestReplyResponse)
def suggest_reply(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    category = ticket.category.name if ticket.category else "other"
    if not ticket.category:
        category, _ = MockAIService.analyze(ticket.subject, ticket.body)
    suggested = MockAIService.get_suggested_reply(category, ticket.subject, ticket.status)
    analysis = AiAnalysis(
        ticket_id=ticket.id,
        suggested_reply=suggested,
        provider="mock",
        model_version="mock-template-v1",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return SuggestReplyResponse(
        suggested_reply=suggested,
        provider="mock",
        model_version="mock-template-v1",
        analysis_id=analysis.id,
    )
