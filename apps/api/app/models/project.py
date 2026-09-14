from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class ProjectCategory(Base, TimestampMixin):
    __tablename__ = "project_categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    translations: Mapped[list["ProjectCategoryTranslation"]] = relationship(cascade="all, delete-orphan")
    projects: Mapped[list["Project"]] = relationship(back_populates="category")


class ProjectCategoryTranslation(Base):
    __tablename__ = "project_category_translations"
    __table_args__ = (UniqueConstraint("category_id", "language_code"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("project_categories.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(2))
    name: Mapped[str] = mapped_column(String(120))


class Project(Base, TimestampMixin):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("project_categories.id"))
    video_media_id: Mapped[int | None] = mapped_column(ForeignKey("media_files.id", ondelete="SET NULL"), nullable=True)
    location: Mapped[str] = mapped_column(String(180))
    area_sqm: Mapped[int | None] = mapped_column(Integer)
    construction_year: Mapped[int | None] = mapped_column(Integer)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    category: Mapped[ProjectCategory] = relationship(back_populates="projects")
    video_media: Mapped["MediaFile | None"] = relationship(foreign_keys=[video_media_id])
    translations: Mapped[list["ProjectTranslation"]] = relationship(cascade="all, delete-orphan")
    images: Mapped[list["ProjectImage"]] = relationship(cascade="all, delete-orphan", order_by="ProjectImage.sort_order")


class ProjectTranslation(Base):
    __tablename__ = "project_translations"
    __table_args__ = (UniqueConstraint("project_id", "language_code"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(180))
    concept: Mapped[str] = mapped_column(String(240))
    short_description: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    challenge: Mapped[str | None] = mapped_column(Text)
    approach: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str | None] = mapped_column(Text)


class MediaFile(Base, TimestampMixin):
    __tablename__ = "media_files"
    id: Mapped[int] = mapped_column(primary_key=True)
    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    public_url: Mapped[str] = mapped_column(String(1000))
    file_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(80))
    file_size: Mapped[int] = mapped_column(Integer)
    alt_text: Mapped[str | None] = mapped_column(String(255))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProjectImage(Base):
    __tablename__ = "project_images"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    media_id: Mapped[int] = mapped_column(ForeignKey("media_files.id"))
    alt_text: Mapped[str | None] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False)
    media: Mapped[MediaFile] = relationship()
