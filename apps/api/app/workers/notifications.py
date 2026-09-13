"""Deliver the transactional outbox with row locking, idempotency and backoff."""
import asyncio
from datetime import datetime, timedelta, timezone
import logging

import httpx
from sqlalchemy import or_, select

from ..config import get_settings
from ..database import SessionLocal
from ..models import NotificationJob

logger = logging.getLogger(__name__)
MAX_ATTEMPTS = 5


def message_text(payload: dict) -> str:
    return "\n".join((
        f"Name: {payload.get('first_name', '')} {payload.get('last_name', '')}",
        f"Email: {payload.get('email', '')}",
        f"Phone: {payload.get('phone') or '-'}",
        f"Subject: {payload.get('subject', '')}",
        "", str(payload.get("message", "")),
    ))


async def process_once() -> int:
    settings = get_settings()
    if not settings.resend_api_key:
        return 0
    processed = 0
    async with httpx.AsyncClient(timeout=15) as client:
        for _ in range(10):
            # Lock one due job until its result is committed. Other workers skip it.
            async with SessionLocal() as db:
                now = datetime.now(timezone.utc)
                job = await db.scalar(
                    select(NotificationJob).where(
                        NotificationJob.status == "pending",
                        NotificationJob.type == "contact_message_email",
                        NotificationJob.attempt_count < MAX_ATTEMPTS,
                        or_(NotificationJob.available_at.is_(None), NotificationJob.available_at <= now),
                    ).order_by(NotificationJob.id).limit(1).with_for_update(skip_locked=True)
                )
                if job is None:
                    break
                job.attempt_count += 1
                try:
                    response = await client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {settings.resend_api_key}",
                            "Idempotency-Key": f"forma-contact-notification-{job.id}",
                        },
                        json={
                            "from": settings.mail_from,
                            "to": [settings.admin_notification_email],
                            "subject": "New Forma Studio contact message",
                            "text": message_text(job.payload_json),
                        },
                    )
                    response.raise_for_status()
                    job.status = "processed"
                    job.processed_at = datetime.now(timezone.utc)
                    job.last_error = None
                except httpx.HTTPError as exc:
                    # Store operational error codes, never provider bodies or credentials.
                    code = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
                    job.last_error = f"{type(exc).__name__}" + (f" (HTTP {code})" if code else "")
                    job.available_at = now + timedelta(seconds=60 * 2 ** (job.attempt_count - 1))
                    if job.attempt_count >= MAX_ATTEMPTS:
                        job.status = "failed"
                await db.commit()
                processed += 1
    return processed


async def main():
    while True:
        try:
            await process_once()
        except Exception as exc:
            # A database restart must not permanently stop message delivery.
            logger.error("Notification worker cycle failed: %s", type(exc).__name__)
        await asyncio.sleep(10)


if __name__ == "__main__":
    asyncio.run(main())
