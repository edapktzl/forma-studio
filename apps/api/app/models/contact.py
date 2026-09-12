from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class ContactMessage(Base, TimestampMixin):
    __tablename__ = "contact_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(320), index=True)
    phone: Mapped[str | None] = mapped_column(String(40))
    subject: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="unread", index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class NotificationJob(Base):
    __tablename__ = "notification_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(80))
    payload_json: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    contact_message_id: Mapped[int | None] = mapped_column(ForeignKey("contact_messages.id", ondelete="CASCADE"))
