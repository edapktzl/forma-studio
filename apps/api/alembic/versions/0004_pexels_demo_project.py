"""Seed one editable bilingual project using high-resolution Pexels media.

The insert is idempotent and intentionally uses a reserved demo slug so it
never overwrites a project created by an administrator.
"""

from alembic import op


revision = "0004_pexels_demo_project"
down_revision = "0003_project_video_media"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
          residential_id integer;
          project_id integer;
          media_id integer;
          created_project boolean := FALSE;
        BEGIN
          SELECT id INTO residential_id
          FROM project_categories
          WHERE slug = 'residential'
          LIMIT 1;

          IF residential_id IS NULL THEN
            INSERT INTO project_categories (slug, sort_order, is_active)
            VALUES ('residential', 10, TRUE)
            RETURNING id INTO residential_id;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM projects WHERE slug = 'cedar-courtyard-demo') THEN
            INSERT INTO projects (slug, category_id, location, area_sqm, construction_year, is_featured, status)
            VALUES ('cedar-courtyard-demo', residential_id, 'Urla, İzmir', 280, 2025, TRUE, 'published');
            created_project := TRUE;
          END IF;

          SELECT id INTO project_id FROM projects WHERE slug = 'cedar-courtyard-demo';

          -- A real project with this reserved slug always wins. Never attach
          -- demo translations or media to an administrator's existing row.
          IF NOT created_project THEN
            RETURN;
          END IF;

          INSERT INTO project_translations
            (project_id, language_code, title, concept, short_description, description, challenge, approach, outcome)
          VALUES
            (project_id, 'en', 'Cedar Courtyard', 'Residential · Architecture and interiors',
             'A calm courtyard house shaped by shade, stone and local olive trees.',
             'Cedar Courtyard organizes daily life around a planted central garden, balancing privacy with long views across the landscape.',
             'Create a generous home on a compact coastal plot without losing the feeling of openness.',
             'Deep reveals, tactile stone and a restrained material palette make the courtyard feel cool and connected.',
             'A durable family home with soft transitions between inside and outside.'),
            (project_id, 'tr', 'Sedir Avlu', 'Konut · Mimari ve iç mekân',
             'Gölge, taş ve yerel zeytin ağaçlarıyla şekillenen sakin bir avlu evi.',
             'Sedir Avlu, günlük yaşamı bitkili bir iç bahçe etrafında kurgular; mahremiyeti manzaraya açılan uzun bakışlarla dengeler.',
             'Kıyıdaki sınırlı parselde açıklık hissini koruyan cömert bir ev tasarlamak.',
             'Derin söveler, dokulu taş ve yalın malzeme paleti avluyu serin ve çevresiyle bağlantılı kılar.',
             'İç ve dış arasında yumuşak geçişler kuran, uzun ömürlü bir aile evi.')
          ON CONFLICT (project_id, language_code) DO NOTHING;

          INSERT INTO media_files (storage_key, public_url, file_name, mime_type, file_size, alt_text)
          VALUES
            ('external/pexels-12700453.jpg', 'https://images.pexels.com/photos/12700453/pexels-photo-12700453.jpeg?auto=compress&cs=tinysrgb&w=2400&q=90', 'cedar-courtyard-pexels-01.jpg', 'image/jpeg', 1011135, 'Cedar Courtyard architectural interior'),
            ('external/pexels-24285883.jpg', 'https://images.pexels.com/photos/24285883/pexels-photo-24285883.jpeg?auto=compress&cs=tinysrgb&w=2400&q=90', 'cedar-courtyard-pexels-02.jpg', 'image/jpeg', 2040132, 'Cedar Courtyard architectural passage'),
            ('external/pexels-35173051.jpg', 'https://images.pexels.com/photos/35173051/pexels-photo-35173051.jpeg?auto=compress&cs=tinysrgb&w=2400&q=90', 'cedar-courtyard-pexels-03.jpg', 'image/jpeg', 1051881, 'Cedar Courtyard light-filled interior')
          ON CONFLICT (storage_key) DO NOTHING;

          FOR media_id IN
            SELECT id FROM media_files WHERE storage_key IN (
              'external/pexels-12700453.jpg',
              'external/pexels-24285883.jpg',
              'external/pexels-35173051.jpg'
            )
          LOOP
            INSERT INTO project_images (project_id, media_id, alt_text, sort_order, is_cover)
            SELECT project_id, media_id, 'Cedar Courtyard project photograph',
                   CASE media_id
                     WHEN (SELECT id FROM media_files WHERE storage_key = 'external/pexels-12700453.jpg') THEN 0
                     WHEN (SELECT id FROM media_files WHERE storage_key = 'external/pexels-24285883.jpg') THEN 1
                     ELSE 2
                   END,
                   media_id = (SELECT id FROM media_files WHERE storage_key = 'external/pexels-12700453.jpg')
            WHERE NOT EXISTS (
              SELECT 1 FROM project_images existing
              WHERE existing.project_id = project_id AND existing.media_id = media_id
            );
          END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM projects
        WHERE slug = 'cedar-courtyard-demo';
        DELETE FROM media_files
        WHERE storage_key IN (
          'external/pexels-12700453.jpg',
          'external/pexels-24285883.jpg',
          'external/pexels-35173051.jpg'
        );
        """
    )
