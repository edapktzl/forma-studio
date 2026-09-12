"""Outbox worker for contact-message notifications. It is inert until RESEND_API_KEY is configured."""
import asyncio
from datetime import datetime, timezone
import httpx
from sqlalchemy import select
from ..config import get_settings
from ..database import SessionLocal
from ..models import NotificationJob

async def process_once() -> int:
    async with SessionLocal() as db:
        jobs = (await db.scalars(select(NotificationJob).where(NotificationJob.status == "pending").limit(10))).all()
        settings = get_settings()
        if not settings.resend_api_key:
            return 0
        async with httpx.AsyncClient(timeout=15) as client:
            for job in jobs:
                try:
                    response = await client.post("https://api.resend.com/emails", headers={"Authorization": f"Bearer {settings.resend_api_key}"}, json={"from": settings.mail_from, "to": [settings.admin_notification_email], "subject": "New Forma Studio contact message", "text": str(job.payload_json)})
                    response.raise_for_status()
                    job.status = "processed"
                    job.processed_at = datetime.now(timezone.utc)
                except Exception as exc:
                    job.attempt_count += 1
                    job.last_error = str(exc)[:2000]
                    if job.attempt_count >= 5:
                        job.status = "failed"
        await db.commit()
        return len(jobs)

async def main():
    while True:
        await process_once()
        await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(main())
