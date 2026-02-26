import io
import csv
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Ticket, Category, AiAnalysis
from app.schemas import TicketCreate, TicketRead, TicketUpdate, AnalyzeResponse, SuggestReplyResponse
from app.repositories.ticket_repo import TicketRepository
from app.services.mock_ai import MockAIService
from app.auth import require_admin, require_admin_dep
from app.services.ai_agent import AIAgent
from app.services.device_extract import extract_device_model
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
    x_client_token: Optional[str] = Header(None, alias="X-Client-Token"),
    db: Session = Depends(get_db),
):
    token = (client_token or x_client_token or "").strip()
    if token:
        repo = TicketRepository()
        tickets = repo.get_list(db, search=search, status=status, category_id=category_id, request_category=request_category, client_token=token, limit=limit, offset=offset)
        return tickets
    if require_admin(request):
        repo = TicketRepository()
        tickets = repo.get_list(db, search=search, status=status, category_id=category_id, request_category=request_category, client_token=None, limit=limit, offset=offset)
        return tickets
    return []


@router.post("/tickets", response_model=TicketRead)
def create_ticket(data: TicketCreate, db: Session = Depends(get_db)):
    device_from_text = extract_device_model((data.subject or "") + "\n" + (data.body or ""))
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
        sender_full_name=data.sender_full_name,
        sender_phone=data.sender_phone,
        object_name=data.object_name,
        device_info=(data.device_info or "").strip() or None,
        device_type=device_from_text,
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


def _parse_serial_numbers(val) -> str:
    """Преобразует serial_numbers в строку для экспорта."""
    if not val:
        return ""
    if isinstance(val, list):
        return ", ".join(val)
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return ", ".join(parsed)
        except json.JSONDecodeError:
            pass
        return val
    return str(val)


# Заголовки для экспорта (ЭРИС кейс)
EXPORT_HEADERS = [
    "ID", "Дата", "ФИО", "Организация", "Телефон", "Email",
    "Заводские номера", "Тип прибора", "Эмоциональный окрас",
    "Категория запроса", "Суть вопроса", "Тема", "Статус",
    "Приоритет", "Требуется оператор"
]


def _ticket_to_export_row(t) -> list:
    """Преобразует тикет в строку для экспорта."""
    return [
        t.id,
        t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
        t.sender_full_name or t.sender_name or "",
        t.object_name or "",
        t.sender_phone or "",
        t.sender_email or "",
        _parse_serial_numbers(t.serial_numbers),
        t.device_type or "",
        {"positive": "Позитивный", "neutral": "Нейтральный", "negative": "Негативный"}.get(t.sentiment or "", ""),
        t.request_category or "",
        t.issue_summary or "",
        t.subject or "",
        {"not_completed": "Не завершён", "completed": "Завершён"}.get(t.status or "", t.status or ""),
        {"low": "Низкий", "medium": "Средний", "high": "Высокий"}.get(t.priority or "", t.priority or ""),
        "Да" if t.operator_required else "Нет"
    ]


@router.get("/tickets/export.csv")
def export_tickets_csv(
    request: Request,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep),
):
    """Экспорт тикетов в CSV с полными полями ЭРИС."""
    repo = TicketRepository()
    tickets = repo.get_list(db, search=search, status=status, category_id=category_id, client_token=None, limit=5000, offset=0)

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow(EXPORT_HEADERS)
    for t in tickets:
        writer.writerow(_ticket_to_export_row(t))
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=tickets_eris.csv"},
    )


@router.get("/tickets/export.xlsx")
def export_tickets_xlsx(
    request: Request,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep),
):
    """Экспорт тикетов в XLSX с полными полями ЭРИС."""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="openpyxl не установлен. Выполните: pip install openpyxl"
        )

    repo = TicketRepository()
    tickets = repo.get_list(db, search=search, status=status, category_id=category_id, client_token=None, limit=5000, offset=0)

    wb = Workbook()
    ws = wb.active
    ws.title = "Обращения ЭРИС"

    # Стили
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="059669", end_color="059669", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Заголовки
    for col, header in enumerate(EXPORT_HEADERS, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # Данные
    for row_idx, t in enumerate(tickets, 2):
        row_data = _ticket_to_export_row(t)
        for col_idx, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center", wrap_text=True)

    # Ширина колонок
    column_widths = [8, 16, 25, 30, 15, 25, 20, 15, 15, 20, 40, 40, 12, 10, 10]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = width

    # Закрепляем заголовок
    ws.freeze_panes = "A2"

    # Сохраняем в буфер
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=tickets_eris.xlsx"}
    )


@router.get("/tickets/{ticket_id}", response_model=TicketRead)
def get_ticket(
    ticket_id: int,
    request: Request,
    client_token: Optional[str] = Query(None),
    x_client_token: Optional[str] = Header(None, alias="X-Client-Token"),
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


@router.delete("/tickets/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep),
):
    """Только админ может удалять тикеты. Пользователь не может удалять."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete(ticket)
    db.commit()
    return {"ok": True}


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
