from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..auth.security import create_access_token, create_refresh_token, verify_password
from ..config import get_settings
from ..database import get_db
from ..dependencies import get_current_admin
from ..models import AdminSession, AdminUser
from ..schemas.auth import CurrentAdmin, LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/csrf")
async def csrf(response: Response, csrf_token: str | None = Cookie(default=None)):
    token = csrf_token or secrets.token_urlsafe(32)
    response.set_cookie("csrf_token", token, httponly=False, secure=get_settings().environment == "production", samesite="lax", max_age=get_settings().refresh_token_days * 86400)
    return {"csrf_token": token}

@router.post("/login", response_model=CurrentAdmin)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(AdminUser).where(AdminUser.email == payload.email, AdminUser.is_active.is_(True)))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    raw_refresh, refresh_hash = create_refresh_token()
    settings = get_settings()
    session = AdminSession(user_id=user.id, refresh_token_hash=refresh_hash, expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days))
    db.add(session)
    await db.commit()
    secure = settings.environment == "production"
    response.set_cookie("access_token", create_access_token(user.id, user.role, session.id), httponly=True, secure=secure, samesite="lax", max_age=settings.access_token_minutes * 60)
    response.set_cookie("refresh_token", raw_refresh, httponly=True, secure=secure, samesite="lax", max_age=settings.refresh_token_days * 86400)
    response.set_cookie("csrf_token", secrets.token_urlsafe(32), httponly=False, secure=secure, samesite="lax", max_age=settings.refresh_token_days * 86400)
    return CurrentAdmin(id=user.id, email=user.email, full_name=user.full_name, role=user.role)

@router.post("/refresh", response_model=CurrentAdmin)
async def refresh(response: Response, refresh_token: str | None = Cookie(default=None), db: AsyncSession = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required")
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    session = await db.scalar(select(AdminSession).where(AdminSession.refresh_token_hash == token_hash).with_for_update())
    now = datetime.now(timezone.utc)
    if not session or session.revoked_at or session.expires_at <= now:
        raise HTTPException(status_code=401, detail="Refresh session expired")
    user = await db.get(AdminUser, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Admin account unavailable")
    session.last_used_at = now
    new_refresh, new_hash = create_refresh_token()
    session.refresh_token_hash = new_hash
    await db.commit()
    settings = get_settings()
    secure = settings.environment == "production"
    response.set_cookie("access_token", create_access_token(user.id, user.role, session.id), httponly=True, secure=secure, samesite="lax", max_age=settings.access_token_minutes * 60)
    response.set_cookie("refresh_token", new_refresh, httponly=True, secure=secure, samesite="lax", max_age=max(0, int((session.expires_at-now).total_seconds())))
    return CurrentAdmin(id=user.id, email=user.email, full_name=user.full_name, role=user.role)

@router.get("/me", response_model=CurrentAdmin)
async def me(user: AdminUser = Depends(get_current_admin)):
    return CurrentAdmin(id=user.id, email=user.email, full_name=user.full_name, role=user.role)

@router.post("/logout", status_code=204)
async def logout(response: Response, refresh_token: str | None = Cookie(default=None), db: AsyncSession = Depends(get_db)):
    if refresh_token:
        session = await db.scalar(select(AdminSession).where(AdminSession.refresh_token_hash == hashlib.sha256(refresh_token.encode()).hexdigest()))
        if session: session.revoked_at = datetime.now(timezone.utc)
        await db.commit()
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    response.delete_cookie("csrf_token")
