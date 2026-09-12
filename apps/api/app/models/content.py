from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class Testimonial(Base, TimestampMixin):
    __tablename__ = "testimonials"
    id: Mapped[int] = mapped_column(primary_key=True)
    client_name: Mapped[str] = mapped_column(String(160))
    company: Mapped[str | None] = mapped_column(String(160))
    role: Mapped[str | None] = mapped_column(String(160))
    rating: Mapped[int] = mapped_column(Integer)
    avatar_media_id: Mapped[int | None] = mapped_column(ForeignKey("media_files.id"))
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    translations: Mapped[list["TestimonialTranslation"]] = relationship(cascade="all, delete-orphan")
    avatar: Mapped["MediaFile | None"] = relationship()


class TestimonialTranslation(Base):
    __tablename__ = "testimonial_translations"
    __table_args__ = (UniqueConstraint("testimonial_id", "language_code"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    testimonial_id: Mapped[int] = mapped_column(ForeignKey("testimonials.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(2))
    quote: Mapped[str] = mapped_column(Text)


class BlogCategory(Base, TimestampMixin):
    __tablename__ = "blog_categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    translations: Mapped[list["BlogCategoryTranslation"]] = relationship(cascade="all, delete-orphan")


class BlogCategoryTranslation(Base):
    __tablename__ = "blog_category_translations"
    __table_args__ = (UniqueConstraint("category_id", "language_code"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("blog_categories.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(2))
    name: Mapped[str] = mapped_column(String(120))


class Article(Base, TimestampMixin):
    __tablename__ = "articles"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("blog_categories.id"))
    author_id: Mapped[int | None] = mapped_column(ForeignKey("admin_users.id"))
    cover_media_id: Mapped[int | None] = mapped_column(ForeignKey("media_files.id"))
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    translations: Mapped[list["ArticleTranslation"]] = relationship(cascade="all, delete-orphan")
    cover: Mapped["MediaFile | None"] = relationship()
    category: Mapped["BlogCategory | None"] = relationship()


class ArticleTranslation(Base):
    __tablename__ = "article_translations"
    __table_args__ = (UniqueConstraint("article_id", "language_code"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(240))
    excerpt: Mapped[str] = mapped_column(String(600))
    content_html: Mapped[str] = mapped_column(Text)
