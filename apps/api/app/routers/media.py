from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4
import warnings

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image, ImageOps, UnidentifiedImageError

from ..auth.rate_limit import rate_limiter
from ..config import get_settings
from ..database import get_db
from ..dependencies import require_admin
from ..models import MediaFile, Project, ProjectImage, Article, Testimonial
from ..services.content import IMAGE_MIME_TYPES, VIDEO_MIME_TYPES, valid_media

router = APIRouter(prefix="/admin/media", tags=["admin-media"])
public_router = APIRouter(prefix="/media", tags=["media"])
IMAGE_MAX_BYTES = 10 * 1024 * 1024
VIDEO_MAX_BYTES = 20 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000
FORMATS = {"JPEG": ("image/jpeg", ".jpg"), "PNG": ("image/png", ".png"), "WEBP": ("image/webp", ".webp")}


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
                # Keep the original encoded file whenever no orientation
                # correction is needed. Re-encoding a JPEG/WebP with Pillow's
                # defaults is lossy and can make uploaded work look blurry.
                orientation = source.getexif().get(274, 1)
                if orientation in (None, 1):
                    return data, FORMATS[actual_format]
                processed = ImageOps.exif_transpose(source)
                if actual_format == "JPEG":
                    processed = processed.convert("RGB")
                output = BytesIO()
                if actual_format == "JPEG":
                    processed.save(output, format="JPEG", quality=98, subsampling=0, optimize=True, progressive=True)
                elif actual_format == "WEBP":
                    processed.save(output, format="WEBP", lossless=True, method=6)
                else:
                    processed.save(output, format="PNG", optimize=True)
                return output.getvalue(), FORMATS[actual_format]
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, "Invalid image, or image dimensions exceed the 20 megapixel limit.")


def decode_video(data, filename, mime):
    if Path(filename).suffix.lower() != ".mp4" or mime != "video/mp4":
        raise HTTPException(415, "Use an MP4 video with a matching content type.")
    if len(data) < 8 or data[4:8] != b"ftyp":
        raise HTTPException(415, "The uploaded file is not a valid MP4 video.")
    return data, (mime, ".mp4")


def item(media):
    return {key: getattr(media, key) for key in ("id", "public_url", "file_name", "mime_type", "file_size", "alt_text", "created_at")}


async def _write_limited(upload: UploadFile, destination: Path, max_bytes: int) -> tuple[int, bool]:
    total = 0
    too_large = False
    with destination.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            remaining = max_bytes - total
            if len(chunk) > remaining:
                if remaining > 0:
                    output.write(chunk[:remaining])
                total += len(chunk)
                too_large = True
                break
            output.write(chunk)
            total += len(chunk)
    return total, too_large


@public_router.get("/{storage_key:path}")
async def serve_media(storage_key: str, db: AsyncSession = Depends(get_db)):
    relative = Path(storage_key)
    if relative.is_absolute() or ".." in relative.parts:
        raise HTTPException(404, "Media not found.")
    media = await db.scalar(
        select(MediaFile).where(
            MediaFile.storage_key == storage_key,
            MediaFile.deleted_at.is_(None),
        )
    )
    # External seed media is served by its absolute public URL, not this route.
    if (not media or media.public_url != f"/media/{storage_key}"
            or media.mime_type not in IMAGE_MIME_TYPES | VIDEO_MIME_TYPES):
        raise HTTPException(404, "Media not found.")
    root = Path(get_settings().media_storage_path).resolve()
    path = (root / relative).resolve()
    if (path != root and root not in path.parents) or not path.is_file():
        raise HTTPException(404, "Media not found.")
    return FileResponse(
        path,
        media_type=media.mime_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("")
async def listing(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    return [
        item(m)
        for m in (
            await db.scalars(
                select(MediaFile)
                .where(MediaFile.deleted_at.is_(None))
                .order_by(MediaFile.id.desc())
            )
        ).all()
    ]


@router.post("", status_code=201)
async def upload(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    settings = get_settings()
    wait = rate_limiter.retry_after(
        ("media-upload", str(admin.id)),
        settings.media_upload_rate_limit,
        settings.media_upload_rate_window_seconds,
    )
    if wait:
        raise HTTPException(
            429,
            "Too many media uploads. Please try again later.",
            headers={"Retry-After": str(wait), "Cache-Control": "no-store"},
        )

    is_video = file.content_type == "video/mp4" or Path(file.filename or "").suffix.lower() == ".mp4"
    max_bytes = VIDEO_MAX_BYTES if is_video else IMAGE_MAX_BYTES
    root = Path(settings.media_storage_path)
    root.mkdir(parents=True, exist_ok=True)
    temporary = root / f".upload-{uuid4().hex}.part"
    final_path = None
    try:
        total, too_large = await _write_limited(file, temporary, max_bytes)
        if too_large:
            raise HTTPException(
                413,
                "Video must be 20 MB or smaller." if is_video else "Image must be 10 MB or smaller.",
            )

        if is_video:
            with temporary.open("rb") as source:
                header = source.read(64)
            _, (mime, suffix) = decode_video(header, file.filename or "", file.content_type)
            data = None
            file_size = total
        else:
            data = temporary.read_bytes()
            data, (mime, suffix) = decode_image(data, file.filename or "", file.content_type)
            if len(data) > max_bytes:
                raise HTTPException(413, "Processed image must be 10 MB or smaller.")
            file_size = len(data)

        key = f"{uuid4().hex}{suffix}"
        final_path = root / key
        if data is None:
            temporary.replace(final_path)
        else:
            final_path.write_bytes(data)
            temporary.unlink(missing_ok=True)

        media = MediaFile(
            storage_key=key,
            public_url=f"/media/{key}",
            file_name=(file.filename or key)[:255],
            mime_type=mime,
            file_size=file_size,
        )
        try:
            db.add(media)
            await db.commit()
        except Exception:
            final_path.unlink(missing_ok=True)
            raise
        return item(media)
    finally:
        await file.close()
        temporary.unlink(missing_ok=True)


class MediaUpdate(BaseModel):
    alt_text: str = Field(default="", max_length=255)


@router.patch("/{identifier}")
async def update(identifier: int, payload: MediaUpdate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    media = await valid_media(db, identifier)
    media.alt_text = payload.alt_text
    await db.commit()
    return item(media)


@router.delete("/{identifier}", status_code=204)
async def delete(identifier: int, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    media = await valid_media(db, identifier)
    for model, column in (
        (Project, Project.video_media_id),
        (ProjectImage, ProjectImage.media_id),
        (Article, Article.cover_media_id),
        (Testimonial, Testimonial.avatar_media_id),
    ):
        if await db.scalar(select(model.id).where(column == identifier).limit(1)):
            raise HTTPException(409, "This media file is still used by content. Remove its references first.")
    media.deleted_at = datetime.now(timezone.utc)
    await db.commit()
