# Forma Studio API contract

The API is available under `/api/v1`.

- `GET /health` returns API health.
- `GET /projects?language=en|tr` returns published projects with pagination and optional `category` and `featured` filters.
- `GET /projects/{slug}?language=en|tr` returns a published project and its gallery URLs.
- `GET /project-categories?language=en|tr` returns active project categories.
- `POST /contact-messages` validates a contact message, stores it, and creates a notification job.
- `GET /articles?language=en|tr` and `GET /testimonials?language=en|tr` expose published content.
- `GET /admin/contact-messages` and `PATCH /admin/contact-messages/{id}/{status}` are protected admin message operations.
- `/admin/projects` provides protected project list, create, update, soft-delete, publish and featured operations.
- `/admin/articles` and `/admin/testimonials` provide protected bilingual CRUD and publish/hide operations.
- `POST /admin/media` validates JPEG, PNG and WebP uploads and stores local development metadata; production can replace this adapter with Cloudflare R2.
- `/auth/login`, `/auth/refresh`, `/auth/logout` and `/auth/me` provide cookie-based admin authentication.

The public response shape is intentionally separate from SQLAlchemy entities so database fields are not exposed accidentally.

Additional management routes:

- `GET /articles/{slug}?language=en|tr` returns a published article; future publication dates stay private.
- `GET /admin/dashboard` returns management counts.
- `/admin/project-categories` and `/admin/blog-categories` support list/create and update/deactivate by ID.
- `GET /admin/media`, `PATCH /admin/media/{id}` and `DELETE /admin/media/{id}` manage the image library. Referenced images cannot be deleted.
- `GET /admin/contact-messages/{id}`, `PATCH /admin/contact-messages/{id}/read|unread|archive` and `DELETE /admin/contact-messages/{id}` manage enquiries.
- `GET /auth/csrf` provides the token to send in `X-CSRF-Token` with authenticated mutations. Requests include credentials; allowed origins are configured explicitly.

Project writes include `images: [{media_id, alt_text, is_cover}]` in gallery order. Article writes include `cover_media_id`, optional `category_id`, `published_at`, and EN/TR translations. Admin detail responses retain both translations; public responses contain only the requested language. Images are decoded and verified before storage; article HTML is sanitized.
