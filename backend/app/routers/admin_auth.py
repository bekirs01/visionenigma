"""Вход по коду администратора (без регистрации)."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.config import get_settings
from app.auth import create_admin_cookie, COOKIE_NAME, COOKIE_MAX_AGE_DAYS, require_admin_dep

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/check")
def admin_check(_admin: bool = Depends(require_admin_dep)):
    """Проверка: 200 если cookie админа валиден."""
    return {"ok": True}


class AdminLoginBody(BaseModel):
    code: str


@router.post("/login")
def admin_login(data: AdminLoginBody):
    """Проверяет код администратора, выставляет httpOnly cookie на 7 дней."""
    settings = get_settings()
    expected = (settings.admin_access_code or "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="Код администратора не настроен (ADMIN_ACCESS_CODE)")
    if (data.code or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Неверный код администратора")
    _, cookie_value = create_admin_cookie(expected)
    response = JSONResponse(content={"ok": True})
    response.set_cookie(
        key=COOKIE_NAME,
        value=cookie_value,
        max_age=COOKIE_MAX_AGE_DAYS * 86400,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return response


@router.post("/logout")
def admin_logout():
    """Сбрасывает cookie админа."""
    response = JSONResponse(content={"ok": True})
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return response
