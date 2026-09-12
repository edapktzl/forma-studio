from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import jwt
from pwdlib import PasswordHash
from ..config import get_settings

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)

def create_access_token(user_id: int, role: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user_id), "role": role, "type": "access", "iat": now, "exp": now + timedelta(minutes=settings.access_token_minutes)}, settings.jwt_secret, algorithm="HS256")

def create_refresh_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(48)
    return token, hashlib.sha256(token.encode()).hexdigest()
