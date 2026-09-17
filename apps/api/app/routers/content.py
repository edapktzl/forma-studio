from datetime import datetime, timezone
from html import unescape
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..dependencies import require_admin
from ..models import Article, ArticleTranslation, BlogCategory, Testimonial, TestimonialTranslation
from ..schemas.content import ArticleCreate, TestimonialCreate
from ..services.content import IMAGE_MIME_TYPES, bilingual, sanitize_html, translations_dict, update_translations, valid_media

router = APIRouter(tags=["content"])
admin_router = APIRouter(prefix="/admin", tags=["admin-content"])

def article_query():
    return select(Article).options(selectinload(Article.translations), selectinload(Article.cover), selectinload(Article.category).selectinload(BlogCategory.translations))

def testimonial_query():
    return select(Testimonial).options(selectinload(Testimonial.translations), selectinload(Testimonial.avatar))

def article_item(record):
    return {**{f:getattr(record, f) for f in ("id", "slug", "category_id", "cover_media_id", "published_at", "status")},
        "translations": translations_dict(record, ("title", "excerpt", "content_html")), "image": record.cover.public_url if record.cover else None}

def testimonial_item(record):
    return {**{f:getattr(record, f) for f in ("id", "client_name", "company", "role", "rating", "avatar_media_id", "status")},
        "translations": translations_dict(record, ("quote",)), "image": record.avatar.public_url if record.avatar else None}

async def find(db, model, stmt, identifier):
    record = await db.scalar(stmt.where(model.id == identifier, model.deleted_at.is_(None)))
    if not record: raise HTTPException(404, "Content not found.")
    return record

def public_article(record, language):
    text = next((t for t in record.translations if t.language_code == language), None)
    if not text: raise HTTPException(404, "Translation unavailable.")
    category = next((t.name for t in record.category.translations if t.language_code == language), "") if record.category else ""
    return {"slug":record.slug, "title":text.title, "excerpt":text.excerpt, "content_html":sanitize_html(text.content_html),
        "published_at":record.published_at, "image":record.cover.public_url if record.cover and not record.cover.deleted_at else None, "category":category}

def check_article(record):
    bilingual({t.language_code:t for t in record.translations})
    if record.category and not record.category.is_active:
        raise HTTPException(422, "Choose an active category before publishing.")
    if any(not t.title.strip() or not t.excerpt.strip() for t in record.translations):
        raise HTTPException(422, "Complete both article titles and excerpts before publishing.")
    if not record.cover or record.cover.deleted_at:
        raise HTTPException(422, "Choose a cover image before publishing.")
    if any(len(unescape(re.sub(r"<[^>]*>", "", sanitize_html(t.content_html))).strip()) < 2 for t in record.translations):
        raise HTTPException(422, "Write article content in both languages.")
    if not record.published_at: record.published_at = datetime.now(timezone.utc)

@router.get("/articles")
async def articles(language: str = Query("en", pattern="^(en|tr)$"), page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    records = (await db.scalars(article_query().where(Article.status=="published", Article.deleted_at.is_(None), Article.published_at <= datetime.now(timezone.utc)).order_by(Article.published_at.desc(), Article.id.desc()).offset((page-1)*page_size).limit(page_size))).all()
    return [public_article(r, language) for r in records]

@router.get("/articles/{slug}")
async def article_detail(slug: str, language: str = Query("en", pattern="^(en|tr)$"), db: AsyncSession = Depends(get_db)):
    record = await db.scalar(article_query().where(Article.slug==slug, Article.status=="published", Article.deleted_at.is_(None), Article.published_at<=datetime.now(timezone.utc)))
    if not record: raise HTTPException(404, "Article not found.")
    return public_article(record, language)

@router.get("/testimonials")
async def testimonials(language: str = Query("en", pattern="^(en|tr)$"), db: AsyncSession = Depends(get_db)):
    records = (await db.scalars(testimonial_query().where(Testimonial.status=="published", Testimonial.deleted_at.is_(None)).order_by(Testimonial.id.desc()))).all()
    return [{**{f:getattr(r, f) for f in ("id", "client_name", "company", "role", "rating")}, "quote":next(t.quote for t in r.translations if t.language_code==language),
        "image":r.avatar.public_url if r.avatar and not r.avatar.deleted_at else None} for r in records]

@admin_router.get("/articles")
async def admin_articles(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    return [article_item(r) for r in (await db.scalars(article_query().where(Article.deleted_at.is_(None)).order_by(Article.id.desc()))).all()]

@admin_router.get("/articles/{identifier}")
async def get_article(identifier:int, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    return article_item(await find(db, Article, article_query(), identifier))

async def save_article(db, record, payload):
    bilingual(payload.translations)
    record.cover = await valid_media(db, payload.cover_media_id, IMAGE_MIME_TYPES)
    record.category = await db.get(BlogCategory, payload.category_id) if payload.category_id else None
    if payload.category_id and not record.category: raise HTTPException(422, "Category unavailable.")
    record.slug, record.status, record.published_at = payload.slug, payload.status, payload.published_at
    record.cover_media_id, record.category_id = payload.cover_media_id, payload.category_id
    update_translations(record, payload.translations, ArticleTranslation)
    if record.status == "published": check_article(record)

@admin_router.post("/articles", status_code=201)
async def create_article(payload:ArticleCreate, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    record = Article(translations=[], author_id=admin.id)
    await save_article(db, record, payload)
    db.add(record)
    await db.commit()
    return article_item(record)

@admin_router.put("/articles/{identifier}")
async def update_article(identifier:int, payload:ArticleCreate, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    record = await find(db, Article, article_query(), identifier)
    with db.no_autoflush:
        await save_article(db, record, payload)
    await db.commit()
    return article_item(record)

@admin_router.delete("/articles/{identifier}", status_code=204)
async def delete_article(identifier:int, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    record = await find(db, Article, article_query(), identifier)
    record.deleted_at, record.status = datetime.now(timezone.utc), "archived"
    await db.commit()

@admin_router.patch("/articles/{identifier}/{action}")
async def article_status(identifier:int, action:str, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    if action not in {"publish", "unpublish"}: raise HTTPException(404, "Action unavailable.")
    record = await find(db, Article, article_query(), identifier)
    if action=="publish": check_article(record)
    record.status = "published" if action=="publish" else "draft"
    await db.commit()
    return article_item(record)

@admin_router.get("/testimonials")
async def admin_testimonials(db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    return [testimonial_item(r) for r in (await db.scalars(testimonial_query().where(Testimonial.deleted_at.is_(None)).order_by(Testimonial.id.desc()))).all()]

@admin_router.get("/testimonials/{identifier}")
async def get_testimonial(identifier:int, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    return testimonial_item(await find(db, Testimonial, testimonial_query(), identifier))

async def save_testimonial(db, record, payload):
    bilingual(payload.translations)
    record.avatar = await valid_media(db, payload.avatar_media_id, IMAGE_MIME_TYPES)
    for field in ("client_name", "company", "role", "rating", "avatar_media_id", "status"):
        setattr(record, field, getattr(payload, field))
    update_translations(record, payload.translations, TestimonialTranslation)

@admin_router.post("/testimonials", status_code=201)
async def create_testimonial(payload:TestimonialCreate, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    record = Testimonial(translations=[])
    await save_testimonial(db, record, payload)
    db.add(record)
    await db.commit()
    return testimonial_item(record)

@admin_router.put("/testimonials/{identifier}")
async def update_testimonial(identifier:int, payload:TestimonialCreate, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    record = await find(db, Testimonial, testimonial_query(), identifier)
    with db.no_autoflush:
        await save_testimonial(db, record, payload)
    await db.commit()
    return testimonial_item(record)

@admin_router.delete("/testimonials/{identifier}", status_code=204)
async def delete_testimonial(identifier:int, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    record = await find(db, Testimonial, testimonial_query(), identifier)
    record.deleted_at, record.status = datetime.now(timezone.utc), "hidden"
    await db.commit()

@admin_router.patch("/testimonials/{identifier}/{action}")
async def testimonial_status(identifier:int, action:str, db:AsyncSession=Depends(get_db), admin=Depends(require_admin)):
    if action not in {"publish", "hide"}: raise HTTPException(404, "Action unavailable.")
    record = await find(db, Testimonial, testimonial_query(), identifier)
    bilingual({t.language_code:t for t in record.translations})
    record.status = "published" if action=="publish" else "hidden"
    await db.commit()
    return testimonial_item(record)
