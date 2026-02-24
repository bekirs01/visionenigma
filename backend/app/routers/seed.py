from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.auth import require_admin_dep
from app.models import Category, Ticket

router = APIRouter(prefix="/api", tags=["seed"])

DEMO_CATEGORIES = [
    {"name": "billing", "description": "Платежи и подписки"},
    {"name": "technical", "description": "Технические проблемы"},
    {"name": "access", "description": "Доступ и аккаунт"},
    {"name": "other", "description": "Прочее"},
]

DEMO_TICKETS = [
    {"sender_email": "user1@example.com", "subject": "Ошибка при оплате", "body": "Не могу оплатить подписку, выдает ошибку payment failed.", "priority": "high"},
    {"sender_email": "user2@example.com", "subject": "Сброс пароля", "body": "Забыл пароль, не приходит письмо для сброса. login access.", "priority": "medium"},
    {"sender_email": "user3@example.com", "subject": "Приложение падает", "body": "После обновления приложение crash и не открывается. Bug.", "priority": "high"},
    {"sender_email": "user4@example.com", "subject": "Вопрос по тарифу", "body": "Хочу уточнить условия subscription и refund.", "priority": "low"},
]


@router.post("/seed-demo")
def seed_demo(db: Session = Depends(get_db), _admin: bool = Depends(require_admin_dep)):
    # Ensure default categories exist
    for c in DEMO_CATEGORIES:
        existing = db.query(Category).filter(Category.name == c["name"]).first()
        if not existing:
            db.add(Category(name=c["name"], description=c.get("description")))
    db.commit()

    # Get category id by name for tickets
    cat_map = {c.name: c.id for c in db.query(Category).all()}
    billing_id = cat_map.get("billing")
    technical_id = cat_map.get("technical")
    access_id = cat_map.get("access")
    other_id = cat_map.get("other")

    for t in DEMO_TICKETS:
        subject = t["subject"]
        body = t["body"]
        if "оплат" in subject or "payment" in body.lower():
            cid = billing_id
        elif "пароль" in subject or "login" in body.lower():
            cid = access_id
        elif "падает" in subject or "crash" in body.lower():
            cid = technical_id
        else:
            cid = other_id
        ticket = Ticket(
            sender_email=t["sender_email"],
            subject=t["subject"],
            body=t["body"],
            status="new",
            priority=t["priority"],
            category_id=cid,
            source="manual",
        )
        db.add(ticket)
    db.commit()
    return {"message": "Demo data seeded", "categories": len(DEMO_CATEGORIES), "tickets": len(DEMO_TICKETS)}
