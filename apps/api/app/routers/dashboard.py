from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..dependencies import require_admin
from ..models import Project, Article, Testimonial, ContactMessage, MediaFile

router = APIRouter(prefix="/admin", tags=["dashboard"])

@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    counts = {}
    for key, model in (("projects", Project), ("articles", Article), ("testimonials", Testimonial), ("media", MediaFile)):
        counts[key] = await db.scalar(select(func.count()).select_from(model).where(model.deleted_at.is_(None)))
    counts["unread_messages"] = await db.scalar(select(func.count()).select_from(ContactMessage).where(ContactMessage.status == "unread"))
    return counts
