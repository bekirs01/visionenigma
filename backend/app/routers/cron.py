"""
Cron endpoints: dış planlayıcı (Railway Cron Job vb.) için.
X-Cron-Secret header zorunlu; secret koda yazılmaz, env'den okunur.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from app.config import get_settings
from app.db import get_db

router = APIRouter(prefix="/api/cron", tags=["cron"])


def require_cron_secret(x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret")):
    settings = get_settings()
    if not settings.cron_secret or not settings.cron_secret.strip():
        raise HTTPException(status_code=501, detail="CRON_SECRET не настроен")
    if not x_cron_secret or x_cron_secret.strip() != settings.cron_secret.strip():
        raise HTTPException(status_code=403, detail="Invalid CRON_SECRET")


@router.post("/sync-inbox")
def cron_sync_inbox(
    db: Session = Depends(get_db),
    _: None = Depends(require_cron_secret),
):
    """
    IMAP INBOX senkronizasyonu. Railway Cron Job ile her 1 dk çağrılabilir.
    Header: X-Cron-Secret: <CRON_SECRET>
    """
    from app.routers.email_stub import _run_sync
    settings = get_settings()
    if not settings.imap_host or not settings.imap_user:
        return {"status": "skipped", "message": "IMAP не настроен"}
    try:
        return _run_sync(db)
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка синхронизации почты")
