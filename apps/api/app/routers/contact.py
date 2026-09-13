from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import require_admin
from ..models import ContactMessage, NotificationJob
from ..schemas.projects import ContactMessageAdminItem, ContactMessageCreate, ContactMessageResponse

router = APIRouter(prefix="/contact-messages", tags=["contact"])
admin_router = APIRouter(prefix="/admin/contact-messages", tags=["admin-contact"])


@router.post("", response_model=ContactMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_contact_message(payload: ContactMessageCreate, db: AsyncSession = Depends(get_db)):
    message = ContactMessage(**payload.model_dump())
    db.add(message)
    await db.flush()
    db.add(NotificationJob(type="contact_message_email", contact_message_id=message.id, payload_json=payload.model_dump(mode="json"), available_at=datetime.now(timezone.utc)))
    await db.commit()
    return ContactMessageResponse(id=message.id, message="Your message has been received.")

@admin_router.get("", response_model=list[ContactMessageAdminItem])
async def list_messages(db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)):
    return (await db.scalars(select(ContactMessage).order_by(ContactMessage.created_at.desc()))).all()

@admin_router.get("/{message_id}", response_model=ContactMessageAdminItem)
async def get_message(message_id: int, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)):
    message = await db.get(ContactMessage, message_id)
    if not message:
        raise HTTPException(404, "Message not found.")
    return message

@admin_router.patch("/{message_id}/{status_name}", response_model=ContactMessageAdminItem)
async def update_message_status(message_id: int, status_name: str, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)):
    if status_name == "archive": status_name = "archived"
    if status_name not in {"read", "unread", "archived"}:
        raise HTTPException(status_code=422, detail="Unsupported message status")
    message = await db.get(ContactMessage, message_id)
    if not message: raise HTTPException(status_code=404, detail="Message not found")
    message.status = status_name
    message.read_at = datetime.now(timezone.utc) if status_name == "read" else None
    await db.commit()
    await db.refresh(message)
    return message

@admin_router.delete("/{message_id}", status_code=204)
async def delete_message(message_id: int, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)):
    message = await db.get(ContactMessage, message_id)
    if not message: raise HTTPException(404, "Message not found.")
    await db.delete(message)
    await db.commit()
