from datetime import datetime, timezone
from fastapi import Cookie, Depends, HTTPException, status
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from .config import get_settings
from .database import get_db
from .models import AdminSession, AdminUser

async def get_current_admin(access_token: str | None = Cookie(default=None), db: AsyncSession = Depends(get_db)) -> AdminUser:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(access_token, get_settings().jwt_secret, algorithms=["HS256"],
                             options={"require": ["sub", "sid", "iat", "exp", "type"]})
        user_id, session_id = int(payload["sub"]), int(payload["sid"])
        if payload["type"] != "access" or user_id < 1 or session_id < 1: raise ValueError
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    session = await db.get(AdminSession, session_id)
    if (not session or session.user_id != user_id or session.revoked_at
            or session.expires_at <= datetime.now(timezone.utc)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session unavailable")
    user = await db.get(AdminUser, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account unavailable")
    return user

def require_admin(user: AdminUser = Depends(get_current_admin)) -> AdminUser:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user
