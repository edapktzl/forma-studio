"""Add database-level integrity checks for public content and media metadata."""

from alembic import op


revision = "0005_data_integrity_checks"
down_revision = "0004_pexels_demo_project"
branch_labels = None
depends_on = None


CHECKS = (
    ("ck_project_status_values", "projects", "status IN ('draft', 'published', 'archived')"),
    ("ck_article_status_values", "articles", "status IN ('draft', 'published', 'archived')"),
    ("ck_testimonial_status_values", "testimonials", "status IN ('draft', 'published', 'hidden')"),
    ("ck_contact_message_status_values", "contact_messages", "status IN ('unread', 'read', 'archived')"),
    ("ck_notification_job_status_values", "notification_jobs", "status IN ('pending', 'processed', 'failed')"),
    ("ck_testimonial_rating_range", "testimonials", "rating BETWEEN 1 AND 5"),
    ("ck_media_mime_values", "media_files", "mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4')"),
    ("ck_project_translation_language", "project_translations", "language_code IN ('en', 'tr')"),
    ("ck_project_category_translation_language", "project_category_translations", "language_code IN ('en', 'tr')"),
    ("ck_article_translation_language", "article_translations", "language_code IN ('en', 'tr')"),
    ("ck_blog_category_translation_language", "blog_category_translations", "language_code IN ('en', 'tr')"),
    ("ck_testimonial_translation_language", "testimonial_translations", "language_code IN ('en', 'tr')"),
)


def upgrade() -> None:
    for name, table, condition in CHECKS:
        op.create_check_constraint(name, table, condition)


def downgrade() -> None:
    for name, table, _ in reversed(CHECKS):
        op.drop_constraint(name, table, type_="check")
