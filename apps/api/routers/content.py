from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..dependencies import require_admin
from ..models import Article, ArticleTranslation, Testimonial, TestimonialTranslation
from ..schemas.content import ArticleCreate, ArticleItem, TestimonialItem

router = APIRouter(tags=["content"])
admin_router = APIRouter(prefix="/admin", tags=["admin-content"])

@router.get("/articles", response_model=list[ArticleItem])
async def articles(language: str = Query("en", pattern="^(en|tr)$"), db: AsyncSession = Depends(get_db)):
    records = (await db.scalars(select(Article).options(selectinload(Article.translations)).where(Article.status == "published", Article.deleted_at.is_(None)).order_by(Article.published_at.desc()))).all()
    return [ArticleItem(slug=a.slug, title=next(t for t in a.translations if t.language_code == language).title, excerpt=next(t for t in a.translations if t.language_code == language).excerpt, published_at=a.published_at) for a in records]

@router.get("/testimonials", response_model=list[TestimonialItem])
async def testimonials(language: str = Query("en", pattern="^(en|tr)$"), db: AsyncSession = Depends(get_db)):
    records = (await db.scalars(select(Testimonial).options(selectinload(Testimonial.translations)).where(Testimonial.status == "published", Testimonial.deleted_at.is_(None)))).all()
    return [TestimonialItem(client_name=t.client_name, company=t.company, role=t.role, rating=t.rating, quote=next(x for x in t.translations if x.language_code == language).quote) for t in records]

@admin_router.post("/articles", status_code=201)
async def create_article(payload: ArticleCreate, db: AsyncSession = Depends(get_db), _admin=Depends(require_admin)):
    if set(payload.translations) != {"en", "tr"}:
        raise HTTPException(status_code=422, detail="Both en and tr translations are required")
    article = Article(slug=payload.slug, translations=[ArticleTranslation(language_code=lang, **translation.model_dump()) for lang, translation in payload.translations.items()])
    db.add(article)
    await db.commit()
    return {"slug": article.slug, "status": article.status}
