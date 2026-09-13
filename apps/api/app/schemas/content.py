from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator

class Translation(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=2, max_length=240)
    excerpt: str = Field(min_length=2, max_length=600)
    content_html: str = Field(min_length=2, max_length=200_000)

class ArticleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=160)
    translations: dict[str, Translation]
    category_id: int | None = None
    cover_media_id: int | None = None
    published_at: datetime | None = None
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")

    @field_validator("published_at")
    @classmethod
    def utc_publish_time(cls, value):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("Publication date must include a timezone.")
        return value.astimezone(timezone.utc) if value is not None else None

class ArticleUpdate(ArticleCreate):
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    category_id: int | None = None

class ArticleItem(BaseModel):
    slug: str
    title: str
    excerpt: str
    published_at: datetime | None
    image: str | None = None
    category: str | None = None

class TestimonialItem(BaseModel):
    client_name: str
    company: str | None
    role: str | None
    rating: int
    quote: str

class TestimonialTranslationData(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    quote: str = Field(min_length=2, max_length=5000)

class TestimonialCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    client_name: str = Field(min_length=2, max_length=160)
    company: str | None = Field(default=None, max_length=160)
    role: str | None = Field(default=None, max_length=160)
    rating: int = Field(ge=1, le=5)
    translations: dict[str, TestimonialTranslationData]
    status: str = Field(default="draft", pattern="^(draft|published|hidden)$")
    avatar_media_id: int | None = None
