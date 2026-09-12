from fastapi import Cookie, Depends, Header, HTTPException, Request, status
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .config import get_settings
from .database import get_db
from .models import AdminUser

async def get_current_admin(request: Request, access_token: str | None = Cookie(default=None), csrf_token: str | None = Cookie(default=None), x_csrf_token: str | None = Header(default=None, alias="X-CSRF-Token"), db: AsyncSession = Depends(get_db)) -> AdminUser:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(access_token, get_settings().jwt_secret, algorithms=["HS256"])
        user_id = int(payload["sub"])
        if payload.get("type") != "access": raise ValueError
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    user = await db.get(AdminUser, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account unavailable")
    return user

def require_admin(user: AdminUser = Depends(get_current_admin)) -> AdminUser:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user
