from fastapi import APIRouter, HTTPException
from app.config import get_settings

router = APIRouter(prefix="/api/email", tags=["email"])


@router.post("/import-mock")
def import_mock():
    """Placeholder: in future, import from IMAP or file. For MVP returns instruction."""
    return {"message": "Use POST /api/tickets to create tickets manually. IMAP import is not implemented."}


@router.post("/fetch")
def fetch_emails():
    """Future: fetch new emails via IMAP. In mock mode returns 501."""
    if get_settings().email_mode == "mock":
        raise HTTPException(status_code=501, detail="Email fetch is disabled. Set EMAIL_MODE and IMAP_* for real integration.")
    raise HTTPException(status_code=501, detail="IMAP integration not implemented.")


@router.post("/send")
def send_email():
    """Future: send reply via SMTP. In mock mode returns 501."""
    if get_settings().email_mode == "mock":
        raise HTTPException(status_code=501, detail="Email send is disabled. Set EMAIL_MODE and SMTP_* for real integration.")
    raise HTTPException(status_code=501, detail="SMTP integration not implemented.")
