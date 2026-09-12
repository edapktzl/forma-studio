from fastapi import HTTPException
from sqlalchemy import select
import nh3
from ..models import MediaFile


def bilingual(translations):
    if set(translations) != {"en", "tr"}:
        raise HTTPException(422, "Both English and Turkish translations are required.")


def sanitize_html(value: str) -> str:
    return nh3.clean(value, tags={"p", "br", "h2", "h3", "strong", "b", "em", "i", "ul", "ol", "li", "blockquote", "a"}, attributes={"a": {"href", "title"}}, url_schemes={"http", "https", "mailto"})


async def valid_media(db, identifier):
    if identifier is None:
        return None
    media = await db.scalar(select(MediaFile).where(MediaFile.id == identifier, MediaFile.deleted_at.is_(None)))
    if not media:
        raise HTTPException(422, "The selected image is unavailable.")
    return media


def translations_dict(record, fields):
    return {t.language_code: {field: getattr(t, field) for field in fields} for t in record.translations}


def update_translations(record, values, model):
    current = {t.language_code: t for t in record.translations}
    for language, value in values.items():
        data = value.model_dump()
        if "content_html" in data:
            data["content_html"] = sanitize_html(data["content_html"])
        if language in current:
            for key, item in data.items():
                setattr(current[language], key, item)
        else:
            record.translations.append(model(language_code=language, **data))
