from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..dependencies import require_admin
from ..models import Project, ProjectCategory, ProjectImage, ProjectTranslation
from ..schemas.projects import ProjectCreate, ProjectUpdate, ProjectDetail, ProjectListItem, ProjectListResponse
from ..services.content import bilingual, translations_dict, update_translations, valid_media

router = APIRouter(prefix="/projects", tags=["projects"])
admin_router = APIRouter(prefix="/admin/projects", tags=["admin-projects"])
category_router = APIRouter(prefix="/project-categories", tags=["project-categories"])
FIELDS = ("title", "concept", "short_description", "description", "challenge", "approach", "outcome")

def query():
    return select(Project).options(selectinload(Project.translations), selectinload(Project.category), selectinload(Project.images).selectinload(ProjectImage.media))

async def find(db, identifier):
    record = await db.scalar(query().where(Project.id == identifier, Project.deleted_at.is_(None)))
    if not record:
        raise HTTPException(404, "Project not found.")
    return record

def admin_item(record):
    return {
        **{key: getattr(record, key) for key in ("id", "slug", "category_id", "location", "area_sqm", "construction_year", "is_featured", "status")},
        "translations": translations_dict(record, FIELDS),
        "images": [{"id": i.id, "media_id": i.media_id, "alt_text": i.alt_text or "", "is_cover": i.is_cover, "url": i.media.public_url, "sort_order": i.sort_order} for i in record.images],
    }

def to_item(record, language):
    text = next((t for t in record.translations if t.language_code == language), None)
    if not text:
        raise HTTPException(404, "Translation unavailable.")
    cover = next((i for i in record.images if i.is_cover and i.media and not i.media.deleted_at), None)
    return ProjectListItem(id=record.id, slug=record.slug, title=text.title, concept=text.concept, short_description=text.short_description,
        location=record.location, area_sqm=record.area_sqm, construction_year=record.construction_year, is_featured=record.is_featured,
        category=record.category.slug, image=cover.media.public_url if cover else None)

def ensure_publishable(record):
    bilingual({t.language_code: t for t in record.translations})
    if not record.category.is_active:
        raise HTTPException(422, "Choose an active category before publishing.")
    if not any(i.is_cover and i.media and not i.media.deleted_at for i in record.images):
        raise HTTPException(422, "Choose a cover image before publishing.")
    if any(not getattr(t, f, "").strip() for t in record.translations for f in ("title", "concept", "short_description", "description")):
        raise HTTPException(422, "Complete both translations before publishing.")

async def apply_payload(db, record, payload):
    bilingual(payload.translations)
    category = await db.get(ProjectCategory, payload.category_id)
    if not category:
        raise HTTPException(422, "Category unavailable.")
    duplicate = await db.scalar(select(Project.id).where(Project.slug == payload.slug, Project.id != (record.id or 0)))
    if duplicate:
        raise HTTPException(409, "This slug is already used, including in deleted projects.")
    ids = [i.media_id for i in payload.images]
    if len(ids) != len(set(ids)):
        raise HTTPException(422, "A gallery image can only be included once.")
    if sum(i.is_cover for i in payload.images) > 1:
        raise HTTPException(422, "Select exactly one cover image.")
    gallery = []
    for index, image in enumerate(payload.images):
        media = await valid_media(db, image.media_id)
        gallery.append(ProjectImage(media=media, media_id=image.media_id, alt_text=image.alt_text, sort_order=index, is_cover=image.is_cover))
    for key in ("slug", "category_id", "location", "area_sqm", "construction_year", "is_featured", "status"):
        setattr(record, key, getattr(payload, key))
    record.category = category
    record.images = gallery
    update_translations(record, payload.translations, ProjectTranslation)
    if record.status == "published":
        ensure_publishable(record)

@router.get("", response_model=ProjectListResponse)
async def list_projects(language: str = Query("en", pattern="^(en|tr)$"), category: str | None = None, featured: bool | None = None,
                        page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    stmt = query().join(Project.category).where(Project.status == "published", Project.deleted_at.is_(None))
    if category:
        stmt = stmt.where(ProjectCategory.slug == category)
    if featured is not None:
        stmt = stmt.where(Project.is_featured == featured)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    records = (await db.scalars(stmt.order_by(Project.is_featured.desc(), Project.id.desc()).offset((page-1)*page_size).limit(page_size))).all()
    return ProjectListResponse(items=[to_item(r, language) for r in records], page=page, page_size=page_size, total=total or 0)

@router.get("/{slug}", response_model=ProjectDetail)
async def detail(slug: str, language: str = Query("en", pattern="^(en|tr)$"), db: AsyncSession = Depends(get_db)):
    record = await db.scalar(query().where(Project.slug == slug, Project.status == "published", Project.deleted_at.is_(None)))
    if not record:
        raise HTTPException(404, "Project not found.")
    text = next(t for t in record.translations if t.language_code == language)
    return ProjectDetail(**to_item(record, language).model_dump(), **{f: getattr(text, f) for f in ("description", "challenge", "approach", "outcome")},
        images=[i.media.public_url for i in record.images if not i.media.deleted_at])

@category_router.get("")
async def categories(language: str = Query("en", pattern="^(en|tr)$"), db: AsyncSession = Depends(get_db)):
    records = (await db.scalars(select(ProjectCategory).options(selectinload(ProjectCategory.translations)).where(ProjectCategory.is_active.is_(True)).order_by(ProjectCategory.sort_order, ProjectCategory.id))).all()
    return [{"id": c.id, "slug": c.slug, "name": next((t.name for t in c.translations if t.language_code == language), "")} for c in records]

@admin_router.get("")
async def admin_list(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    return [admin_item(r) for r in (await db.scalars(query().where(Project.deleted_at.is_(None)).order_by(Project.id.desc()))).all()]

@admin_router.get("/{identifier}")
async def admin_detail(identifier: int, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    return admin_item(await find(db, identifier))

@admin_router.post("", status_code=201)
async def create(payload: ProjectCreate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    record = Project(translations=[], images=[])
    await apply_payload(db, record, payload)
    db.add(record)
    await db.commit()
    return admin_item(record)

@admin_router.put("/{identifier}")
async def update(identifier: int, payload: ProjectUpdate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    record = await find(db, identifier)
    with db.no_autoflush:
        await apply_payload(db, record, payload)
    await db.commit()
    return admin_item(record)

@admin_router.delete("/{identifier}", status_code=204)
async def delete(identifier: int, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    record = await find(db, identifier)
    record.deleted_at, record.status = datetime.now(timezone.utc), "archived"
    await db.commit()

@admin_router.patch("/{identifier}/publish")
async def publish(identifier: int, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    record = await find(db, identifier)
    ensure_publishable(record)
    record.status = "published"
    await db.commit()
    return admin_item(record)

@admin_router.patch("/{identifier}/feature")
async def feature(identifier: int, featured: bool, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    record = await find(db, identifier)
    record.is_featured = featured
    await db.commit()
    return admin_item(record)
