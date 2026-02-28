"""
Analytics endpoints for ERIS dashboard.
Uses same tickets table as admin panel list. Never returns 500 on empty data.
All date logic in UTC. Null-safe aggregates.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, cast, Date, or_
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db
from app.models import Ticket
from app.auth import require_admin_dep

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# UTC now for consistent date filters (same as admin list)
def _utc_now():
    return datetime.now(timezone.utc)


# ===================== Schemas =====================

class SummaryStats(BaseModel):
    total_tickets: int
    completed: int
    not_completed: int
    operator_required: int
    avg_response_hours: Optional[float]
    today_tickets: int
    week_tickets: int


class CategoryStat(BaseModel):
    category: str
    count: int
    percentage: float


class SentimentStat(BaseModel):
    sentiment: str
    count: int
    percentage: float


class SourceStat(BaseModel):
    source: str
    count: int
    percentage: float


class TimelineStat(BaseModel):
    date: str
    count: int


class DeviceTypeStat(BaseModel):
    device_type: str
    count: int
    percentage: float


# ===================== Endpoints =====================

@router.get("/summary", response_model=SummaryStats)
def get_summary(
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep)
):
    """Overall ticket statistics (same source as admin panel list)."""
    try:
        now = _utc_now()
        total = db.query(func.count(Ticket.id)).scalar() or 0
        completed = db.query(func.count(Ticket.id)).filter(
            or_(
                Ticket.status == "completed",
                Ticket.completed_at.isnot(None),
                Ticket.reply_sent == 1
            )
        ).scalar() or 0
        not_completed = total - completed
        operator_required = db.query(func.count(Ticket.id)).filter(
            Ticket.operator_required.is_(True)
        ).scalar() or 0

        avg_response = None
        tickets_with_reply = db.query(Ticket).filter(
            Ticket.reply_sent_at.isnot(None),
            Ticket.created_at.isnot(None)
        ).all()
        if tickets_with_reply:
            total_sec = 0
            n = 0
            for t in tickets_with_reply:
                if t.reply_sent_at and t.created_at:
                    total_sec += (t.reply_sent_at - t.created_at).total_seconds()
                    n += 1
            if n > 0:
                avg_response = round(total_sec / n / 3600, 2)

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_tickets = db.query(func.count(Ticket.id)).filter(
            Ticket.created_at >= today_start
        ).scalar() or 0

        week_start = today_start - timedelta(days=now.weekday())
        week_tickets = db.query(func.count(Ticket.id)).filter(
            Ticket.created_at >= week_start
        ).scalar() or 0

        return SummaryStats(
            total_tickets=total,
            completed=completed,
            not_completed=not_completed,
            operator_required=operator_required,
            avg_response_hours=avg_response,
            today_tickets=today_tickets,
            week_tickets=week_tickets
        )
    except Exception:
        return SummaryStats(
            total_tickets=0,
            completed=0,
            not_completed=0,
            operator_required=0,
            avg_response_hours=None,
            today_tickets=0,
            week_tickets=0
        )


@router.get("/by-category", response_model=List[CategoryStat])
def get_by_category(
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep)
):
    """Ticket distribution by request_category (ERIS). Null -> Без категории."""
    try:
        total = db.query(func.count(Ticket.id)).scalar() or 1
        results = db.query(
            func.coalesce(Ticket.request_category, "Без категории").label("category"),
            func.count(Ticket.id).label("count")
        ).group_by(Ticket.request_category).order_by(func.count(Ticket.id).desc()).all()
        return [
            CategoryStat(
                category=r.category or "Без категории",
                count=r.count,
                percentage=round(r.count / total * 100, 1)
            )
            for r in results
        ]
    except Exception:
        return []


@router.get("/by-sentiment", response_model=List[SentimentStat])
def get_by_sentiment(
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep)
):
    """Ticket distribution by sentiment. Null -> Не определено."""
    try:
        total = db.query(func.count(Ticket.id)).scalar() or 1
        results = db.query(
            func.coalesce(Ticket.sentiment, "unknown").label("sentiment"),
            func.count(Ticket.id).label("count")
        ).group_by(Ticket.sentiment).order_by(func.count(Ticket.id).desc()).all()
        sentiment_labels = {
            "positive": "Позитивная",
            "neutral": "Нейтральная",
            "negative": "Негативная",
            "unknown": "Не определено"
        }
        return [
            SentimentStat(
                sentiment=sentiment_labels.get(r.sentiment, r.sentiment or "Не определено"),
                count=r.count,
                percentage=round(r.count / total * 100, 1)
            )
            for r in results
        ]
    except Exception:
        return []


@router.get("/by-source", response_model=List[SourceStat])
def get_by_source(
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep)
):
    """Ticket distribution by source (manual/email/import). Null -> unknown."""
    try:
        total = db.query(func.count(Ticket.id)).scalar() or 1
        results = db.query(
            func.coalesce(Ticket.source, "manual").label("source"),
            func.count(Ticket.id).label("count")
        ).group_by(Ticket.source).order_by(func.count(Ticket.id).desc()).all()
        source_labels = {
            "manual": "Вручную",
            "email": "Email",
            "import": "Импорт"
        }
        return [
            SourceStat(
                source=source_labels.get(r.source, r.source or "unknown"),
                count=r.count,
                percentage=round(r.count / total * 100, 1)
            )
            for r in results
        ]
    except Exception:
        return []


@router.get("/timeline", response_model=List[TimelineStat])
def get_timeline(
    days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep)
):
    """Ticket counts per day for the last N days (UTC)."""
    try:
        now = _utc_now()
        start_dt = now - timedelta(days=days)
        date_counts = {}
        for i in range(days):
            d = (start_dt + timedelta(days=i)).date()
            date_counts[d.isoformat()] = 0

        date_col = cast(Ticket.created_at, Date)
        results = db.query(
            date_col.label("date"),
            func.count(Ticket.id).label("count")
        ).filter(
            Ticket.created_at >= start_dt
        ).group_by(date_col).all()

        for r in results:
            if r.date is not None:
                date_str = r.date.isoformat() if hasattr(r.date, "isoformat") else str(r.date)
                if date_str in date_counts:
                    date_counts[date_str] = int(r.count) if r.count is not None else 0

        return [
            TimelineStat(date=date, count=count)
            for date, count in sorted(date_counts.items())
        ]
    except Exception:
        now = _utc_now()
        return [
            TimelineStat(date=(now - timedelta(days=i)).date().isoformat(), count=0)
            for i in range(29, -1, -1)
        ]


@router.get("/by-device-type", response_model=List[DeviceTypeStat])
def get_by_device_type(
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep)
):
    """Ticket distribution by device_type. Null/empty excluded."""
    try:
        total = db.query(func.count(Ticket.id)).filter(
            Ticket.device_type.isnot(None),
            Ticket.device_type != ""
        ).scalar() or 1
        results = db.query(
            Ticket.device_type,
            func.count(Ticket.id).label("count")
        ).filter(
            Ticket.device_type.isnot(None),
            Ticket.device_type != ""
        ).group_by(Ticket.device_type).order_by(func.count(Ticket.id).desc()).limit(10).all()
        return [
            DeviceTypeStat(
                device_type=r.device_type or "",
                count=r.count,
                percentage=round(r.count / total * 100, 1)
            )
            for r in results
        ]
    except Exception:
        return []


@router.get("/operator-stats")
def get_operator_stats(
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep)
):
    """Statistics on tickets requiring operator (operator_required)."""
    try:
        total = db.query(func.count(Ticket.id)).scalar() or 1
        requires_operator = db.query(func.count(Ticket.id)).filter(
            Ticket.operator_required.is_(True)
        ).scalar() or 0
        reasons = db.query(
            func.coalesce(Ticket.operator_reason, "Не указано").label("reason"),
            func.count(Ticket.id).label("count")
        ).filter(
            Ticket.operator_required.is_(True)
        ).group_by(Ticket.operator_reason).order_by(func.count(Ticket.id).desc()).all()
        return {
            "total_tickets": total,
            "requires_operator": requires_operator,
            "percentage": round(requires_operator / total * 100, 1) if total else 0,
            "by_reason": [{"reason": r.reason or "Не указано", "count": r.count} for r in reasons]
        }
    except Exception:
        return {
            "total_tickets": 0,
            "requires_operator": 0,
            "percentage": 0,
            "by_reason": []
        }
