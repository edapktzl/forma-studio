from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class AdminUser(Base, TimestampMixin):
    __tablename__ = "admin_users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(30), default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sessions: Mapped[list["AdminSession"]] = relationship(cascade="all, delete-orphan")


class AdminSession(Base):
    __tablename__ = "admin_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("admin_users.id", ondelete="CASCADE"))
    refresh_token_hash: Mapped[str] = mapped_column(String(128), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
