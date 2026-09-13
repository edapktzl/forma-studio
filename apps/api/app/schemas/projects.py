from datetime import datetime
import re
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ProjectTranslationData(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=2, max_length=180)
    concept: str = Field(min_length=2, max_length=240)
    short_description: str = Field(min_length=2, max_length=500)
    description: str = Field(min_length=2, max_length=50_000)
    challenge: str | None = Field(default=None, max_length=20_000)
    approach: str | None = Field(default=None, max_length=20_000)
    outcome: str | None = Field(default=None, max_length=20_000)


class ProjectListItem(BaseModel):
    id: int
    slug: str
    title: str
    concept: str
    short_description: str
    location: str
    area_sqm: int | None
    construction_year: int | None
    is_featured: bool
    category: str | None = None
    image: str | None = None


class ProjectListResponse(BaseModel):
    items: list[ProjectListItem]
    page: int
    page_size: int
    total: int

class ProjectDetail(ProjectListItem):
    description: str
    challenge: str | None
    approach: str | None
    outcome: str | None
    images: list[str]


class ProjectImageData(BaseModel):
    media_id: int = Field(gt=0)
    alt_text: str = Field(default="", max_length=255)
    is_cover: bool = False


class ProjectCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=140)
    category_id: int = Field(gt=0)
    location: str = Field(min_length=2, max_length=180)
    area_sqm: int | None = Field(default=None, ge=0)
    construction_year: int | None = Field(default=None, ge=1800, le=2200)
    translations: dict[str, ProjectTranslationData]
    images: list[ProjectImageData] = Field(default_factory=list, max_length=30)
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    is_featured: bool = False

class ProjectUpdate(ProjectCreate):
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    is_featured: bool = False


class ContactMessageCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    first_name: str = Field(min_length=2, max_length=100)
    last_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=15, max_length=5000)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value):
        if not value:
            return None
        if not re.fullmatch(r"\+?[0-9() .-]+", value):
            raise ValueError("Enter a valid phone number.")
        digits = re.sub(r"[^0-9]", "", value)
        if not 7 <= len(digits) <= 15:
            raise ValueError("Phone numbers must contain 7 to 15 digits.")
        return ("+" if value.startswith("+") else "") + digits


class ContactMessageResponse(BaseModel):
    id: int
    message: str

class ContactMessageAdminItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None
    subject: str
    message: str
    status: str
    created_at: datetime
    read_at: datetime | None
