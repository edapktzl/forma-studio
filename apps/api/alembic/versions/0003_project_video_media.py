"""Allow projects to use an optional MP4 hero video."""

from alembic import op
import sqlalchemy as sa


revision = "0003_project_video_media"
down_revision = "0002_default_project_categories"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("video_media_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_projects_video_media_id_media_files",
        "projects",
        "media_files",
        ["video_media_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_projects_video_media_id_media_files",
        "projects",
        type_="foreignkey",
    )
    op.drop_column("projects", "video_media_id")
