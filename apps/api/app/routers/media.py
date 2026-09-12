from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..config import get_settings
from ..database import get_db
from ..dependencies import require_admin
from ..models import MediaFile, ProjectImage, Article, Testimonial
from ..services.content import valid_media

router = APIRouter(prefix="/admin/media", tags=["admin-media"])
MAX_BYTES = 10 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000
FORMATS = {"JPEG":("image/jpeg",".jpg"), "PNG":("image/png",".png"), "WEBP":("image/webp",".webp")}

def decode_image(data, filename, mime):
    if Path(filename).suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(415, "Use a JPEG, PNG or WebP filename.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as source:
                actual_format = source.format
                if actual_format not in FORMATS or FORMATS[actual_format][0] != mime:
                    raise HTTPException(415, "Image content and file type do not match.")
                source.verify()
            with Image.open(BytesIO(data)) as source:
                source.load()
                processed = ImageOps.exif_transpose(source)
                if actual_format == "JPEG": processed = processed.convert("RGB")
                output = BytesIO()
                processed.save(output, format=actual_format)
                return output.getvalue(), FORMATS[actual_format]
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, "Invalid image, or image dimensions exceed the 20 megapixel limit.")

def item(media):
    return {key:getattr(media,key) for key in ("id", "public_url", "file_name", "mime_type", "file_size", "alt_text", "created_at")}

@router.get("")
async def listing(db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    return [item(m) for m in (await db.scalars(select(MediaFile).where(MediaFile.deleted_at.is_(None)).order_by(MediaFile.id.desc()))).all()]

@router.post("", status_code=201)
async def upload(file:UploadFile=File(...), db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    data = await file.read(MAX_BYTES+1)
    await file.close()
    if len(data)>MAX_BYTES: raise HTTPException(413, "Image must be 10 MB or smaller.")
    data, (mime, suffix) = decode_image(data, file.filename or "", file.content_type)
    if len(data)>MAX_BYTES: raise HTTPException(413, "Processed image must be 10 MB or smaller.")
    key = f"{uuid4().hex}{suffix}"
    root = Path(get_settings().media_storage_path)
    root.mkdir(parents=True, exist_ok=True)
    path = root/key
    path.write_bytes(data)
    media = MediaFile(storage_key=key, public_url=f"/media/{key}", file_name=(file.filename or key)[:255], mime_type=mime, file_size=len(data))
    try:
        db.add(media)
        await db.commit()
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return item(media)

class MediaUpdate(BaseModel):
    alt_text: str = Field(default="", max_length=255)

@router.patch("/{identifier}")
async def update(identifier:int, payload:MediaUpdate, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    media = await valid_media(db, identifier)
    media.alt_text = payload.alt_text
    await db.commit()
    return item(media)

@router.delete("/{identifier}", status_code=204)
async def delete(identifier:int, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    media = await valid_media(db, identifier)
    for model, column in ((ProjectImage,ProjectImage.media_id),(Article,Article.cover_media_id),(Testimonial,Testimonial.avatar_media_id)):
        if await db.scalar(select(model.id).where(column==identifier).limit(1)):
            raise HTTPException(409, "This image is still used by content. Remove its references first.")
    media.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    # Keep the file for recovery; deleted media is no longer selectable or publishable.
