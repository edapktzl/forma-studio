"""seed the starter project categories

The category editor remains fully dynamic. These four records only provide a
useful starting point for a fresh installation so a new project can be created
without first discovering that the category table is empty.
"""
from alembic import op


revision = "0002_default_project_categories"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        INSERT INTO project_categories (slug, sort_order, is_active)
        VALUES
          ('residential', 10, TRUE),
          ('commercial', 20, TRUE),
          ('hospitality', 30, TRUE),
          ('cultural', 40, TRUE)
        ON CONFLICT (slug) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO project_category_translations (category_id, language_code, name)
        SELECT categories.id, values_table.language_code, values_table.name
        FROM project_categories AS categories
        JOIN (VALUES
          ('residential', 'en', 'Residential'),
          ('residential', 'tr', 'Konut'),
          ('commercial', 'en', 'Commercial'),
          ('commercial', 'tr', 'Ticari'),
          ('hospitality', 'en', 'Hospitality'),
          ('hospitality', 'tr', 'Konaklama'),
          ('cultural', 'en', 'Cultural'),
          ('cultural', 'tr', 'Kültürel')
        ) AS values_table(slug, language_code, name)
          ON values_table.slug = categories.slug
        ON CONFLICT (category_id, language_code) DO NOTHING
        """
    )


def downgrade():
    # Preserve a seeded category once an administrator has used or edited it.
    op.execute(
        """
        DELETE FROM project_category_translations AS translations
        USING project_categories AS categories
        WHERE translations.category_id = categories.id
          AND categories.slug IN ('residential', 'commercial', 'hospitality', 'cultural')
          AND NOT EXISTS (
            SELECT 1 FROM projects WHERE projects.category_id = categories.id
          )
        """
    )
    op.execute(
        """
        DELETE FROM project_categories AS categories
        WHERE categories.slug IN ('residential', 'commercial', 'hospitality', 'cultural')
          AND NOT EXISTS (
            SELECT 1 FROM projects WHERE projects.category_id = categories.id
          )
        """
    )
