from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..dependencies import require_admin
from ..models import ProjectCategory, ProjectCategoryTranslation, BlogCategory, BlogCategoryTranslation
from ..services.content import bilingual, translations_dict, update_translations

router = APIRouter(prefix="/admin", tags=["admin-categories"])
public_router = APIRouter(tags=["categories"])

class CategoryTranslation(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=120)

class CategoryData(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True
    translations: dict[str, CategoryTranslation]

def types(kind):
    if kind == "project-categories": return ProjectCategory, ProjectCategoryTranslation
    if kind == "blog-categories": return BlogCategory, BlogCategoryTranslation
    raise HTTPException(404, "Category type not found.")

def item(record):
    return {"id": record.id, "slug": record.slug, "sort_order": record.sort_order, "is_active": record.is_active, "translations": translations_dict(record, ("name",))}

@public_router.get("/blog-categories")
async def public_categories(language: str = Query("en", pattern="^(en|tr)$"), db: AsyncSession = Depends(get_db)):
    records = (await db.scalars(select(BlogCategory).options(selectinload(BlogCategory.translations)).where(BlogCategory.is_active.is_(True)).order_by(BlogCategory.sort_order))).all()
    return [{"id": r.id, "slug": r.slug, "name": next((t.name for t in r.translations if t.language_code == language), "")} for r in records]

# This router is registered after the specific resource routers.
@router.get("/{kind}")
async def listing(kind: str, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    model, _ = types(kind)
    records = (await db.scalars(select(model).options(selectinload(model.translations)).order_by(model.sort_order, model.id))).all()
    return [item(r) for r in records]

@router.post("/{kind}", status_code=201)
async def create(kind: str, payload: CategoryData, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    model, translation = types(kind)
    bilingual(payload.translations)
    record = model(slug=payload.slug, sort_order=payload.sort_order, is_active=payload.is_active, translations=[])
    update_translations(record, payload.translations, translation)
    db.add(record)
    await db.commit()
    return item(record)

@router.put("/{kind}/{identifier}")
async def update(kind: str, identifier: int, payload: CategoryData, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    model, translation = types(kind)
    record = await db.scalar(select(model).options(selectinload(model.translations)).where(model.id == identifier))
    if not record: raise HTTPException(404, "Category not found.")
    bilingual(payload.translations)
    record.slug, record.sort_order, record.is_active = payload.slug, payload.sort_order, payload.is_active
    update_translations(record, payload.translations, translation)
    await db.commit()
    return item(record)

@router.delete("/{kind}/{identifier}", status_code=204)
async def delete(kind: str, identifier: int, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    model, _ = types(kind)
    record = await db.get(model, identifier)
    if not record: raise HTTPException(404, "Category not found.")
    record.is_active = False
    await db.commit()
