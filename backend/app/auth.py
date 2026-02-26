"""Простая проверка админа по коду и signed cookie (без аккаунтов)."""
import hmac
import hashlib
import base64
import time
from typing import Optional, Tuple
from fastapi import Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from app.config import get_settings

COOKIE_NAME = "admin_session"
COOKIE_MAX_AGE_DAYS = 7


def _sign(value: str, secret: str) -> str:
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def create_admin_cookie(secret: str) -> Tuple[str, str]:
    """Возвращает (value, signed_value) для cookie."""
    ts = str(int(time.time()))
    sig = _sign(ts, secret)
    payload = f"{ts}.{sig}"
    return payload, base64.urlsafe_b64encode(payload.encode()).decode()


def verify_admin_cookie(cookie_value: str, secret: str) -> bool:
    """Проверяет подпись и срок (7 дней)."""
    if not secret or not cookie_value:
        return False
    try:
        raw = base64.urlsafe_b64decode(cookie_value.encode()).decode()
        ts_str, sig = raw.split(".", 1)
        ts = int(ts_str)
        if _sign(ts_str, secret) != sig:
            return False
        if time.time() - ts > COOKIE_MAX_AGE_DAYS * 86400:
            return False
        return True
    except Exception:
        return False


def get_admin_cookie(request: Request) -> Optional[str]:
    return request.cookies.get(COOKIE_NAME)


def require_admin(request: Request) -> bool:
    """True если запрос от админа (валидный cookie)."""
    code = get_admin_cookie(request)
    secret = get_settings().admin_access_code or ""
    return verify_admin_cookie(code or "", secret)


def require_admin_dep(request: Request):
    """Depends: 403 если не админ."""
    if not require_admin(request):
        raise HTTPException(status_code=403, detail="Требуется код администратора")
    return True
