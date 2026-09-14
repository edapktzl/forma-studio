# Forma Studio

A complete bilingual corporate website for a fictional architecture and interior design studio. English and Turkish pages share the same content, routes, and visual system.

The repository includes a FastAPI API, PostgreSQL schema, Alembic migration, cookie-based admin authentication, content management, contact-message persistence, notification jobs, and a separate admin application.

## Getting started

```sh
npm install
npm run dev
```

Open http://localhost:3000 (opens `/en/`). Turkish content starts at `/tr/`. If Windows PowerShell blocks npm scripts, use `npm.cmd` instead of `npm`.

## Hosting and continuous integration

The previous GitHub Pages site is a historical static preview. The current application requires a Next.js server and FastAPI; it cannot be published as a static Pages export.

`.github/workflows/ci.yml` checks both frontend builds and API tests on pushes and pull requests. It does not deploy to an external server. Use the Docker setup below for the dynamic application.

To build and run the production version:

```sh
npm run build
npm start
```

## Features

- Separate Home, About, Services, Projects, Insights, Contact, and Privacy pages in both languages.
- Four project detail pages and three full journal articles per language.
- Language switching preserves the current page, including project and article details.
- Responsive navigation with an accessible hamburger menu, keyboard focus handling, and Escape-to-close.
- Project category filters, expandable service FAQs, and a validated contact form with name, email, phone, subject, and message fields.
- Server-rendered language attributes and page metadata, static generation, reduced-motion support, and descriptive image alternatives.
- The homepage hero rotates featured projects and can play an optional muted MP4 selected from the admin media library. Uploaded photographs keep their original encoded bytes unless orientation correction is required.

## Routes

All routes are available under both `/en` and `/tr`:

| Page | Path |
| --- | --- |
| Home | `/{locale}` |
| About | `/{locale}/about` |
| Services | `/{locale}/services` |
| Projects | `/{locale}/projects` |
| Project detail | `/{locale}/projects/{slug}` |
| Insights | `/{locale}/insights` |
| Article | `/{locale}/insights/{slug}` |
| Contact | `/{locale}/contact` |
| Privacy | `/{locale}/privacy` |

## Project structure

- `app/(entry)/`: root redirect and its layout.
- `app/[locale]/`: localized layouts and actual page routes.
- `components/`: shared navigation, footer, cards, project filters, and contact form.
- `lib/content.js`: static fallback content used when the public API is not configured. API-enabled pages switch to FastAPI content at runtime.
- `app/globals.css`: Tailwind entry point, design system, responsive layouts, and motion preferences.
- `public/icon.svg`: studio favicon.
- `postcss.config.mjs`: stylesheet build configuration.

Built with Next.js App Router, React, Tailwind CSS, and Lucide icons. The production content stack uses FastAPI, PostgreSQL, Alembic and a separate admin Next.js app.

## Demo limitations

Forma is a fictional company. Team profiles, project stories, statistics, and testimonials are illustrative. Photographs are served from Unsplash and require an internet connection; they are not claimed as original studio work. System typography avoids external font requests.

When the API is not configured, project/article pages and the contact form use safe static/demo fallbacks. With `NEXT_PUBLIC_API_URL` set, the contact form stores messages through FastAPI and public project/article lists read published records from the API; it never downloads a file. Replace the example company content and configure a real e-mail/storage provider before launching a public business site.

## Backend development

Install and start Docker Desktop with its WSL 2 backend on Windows. From the repository root, copy `.env.example` to `.env` and replace `POSTGRES_PASSWORD` and `JWT_SECRET` with random secrets. Use a URL-safe database password because Compose includes it in the database connection URL. Keep `.env` private.

```sh
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
docker compose --env-file .env -f infra/docker-compose.yml ps
```

The public site is available at http://localhost:3000, the admin panel at http://localhost:3001/login, and Swagger at http://localhost:8000/docs. PostgreSQL data and uploaded images persist in Docker volumes. The migration service creates the schema before API/worker startup. Local ports bind only to this computer. To stop the stack while keeping its data, run `docker compose --env-file .env -f infra/docker-compose.yml down`.

Both Next.js applications receive `NEXT_PUBLIC_API_URL` at build time. Rebuild after changing it. After installing Docker, restart your IDE terminal if the `docker` command is not found.

Once the API is running, run `python scripts/bootstrap-local-admin.py` to create the local administrator. Its random login credentials are saved in `.env.admin.local`, which is excluded from Git and Docker images. Re-running the command preserves the existing account. The script refuses to provision production environments.

### Which credential goes where?

`.env.admin.local` contains the admin panel login (`email` and `password`) for local development. It is a JSON file and must not be copied to the VPS or committed. The API does not have a separate “API email and password” login: the admin panel authenticates with the account created by the bootstrap/seed step.

The VPS `/opt/forma-studio/.env` file contains infrastructure settings. `POSTGRES_PASSWORD` is only the PostgreSQL database password, `JWT_SECRET` signs admin sessions, `RESEND_API_KEY` is the mail provider API key, `MAIL_FROM` is the verified sender address, and `ADMIN_NOTIFICATION_EMAIL` is the address that receives contact notifications. These values are one per line as `KEY=value`; do not include angle brackets or quotes unless the value itself requires them. Keep this file private and set permissions to `chmod 600 /opt/forma-studio/.env`.

The admin panel includes a dashboard, bilingual project and article editors, testimonials, category management, an image library and a message inbox. Projects support gallery ordering and cover selection. Articles use a block editor for paragraphs, headings, quotes and lists. Publication checks require both languages and a cover for projects and articles. Public lists and detail routes read published API content when configured, including newly created slugs. Admin sessions use HttpOnly cookies, CSRF verification and refresh-token rotation.

To add the prepared bilingual demo project without touching existing records, set `FORMA_ADMIN_EMAIL` and `FORMA_ADMIN_PASSWORD` and run `python scripts/seed-demo-project.py`. The script uploads three high-resolution Pexels photographs and publishes the project only when its slug is not already present. Set `FORMA_DEMO_VIDEO` to a local MP4 path if you also want to bind a hero video.

The API uses FastAPI, async SQLAlchemy, PostgreSQL, and Alembic. Public routes are versioned under `/api/v1`; admin writes require authentication. Image uploads currently use the local media volume; the R2 adapter remains pending. Service content and general site settings do not yet have admin editors. Configure `RESEND_API_KEY`, `MAIL_FROM`, and `ADMIN_NOTIFICATION_EMAIL` to enable the notification worker. From `apps/api`, local API smoke tests run with `python -m pytest tests` after installing `requirements.txt`.

With the local stack and administrator configured, run `python scripts/check-admin-api.py` for CRUD and security integration checks. It removes its temporary records afterward. Run `node scripts/check-admin-browser.mjs` for desktop/mobile admin checks using Microsoft Edge (or set `BROWSER_PATH`). These scripts are intended for local development only.

The production deployment targets Oracle Cloud Ubuntu 22.04 with `www.edanurpektezel.com`, `admin.edanurpektezel.com`, and `api.edanurpektezel.com`. Production Compose pulls immutable images from GHCR; it does not build on the 1 GB VPS. Copy `infra/docker-compose.yml`, `infra/docker-compose.prod.yml`, and `infra/Caddyfile` to `/opt/forma-studio`, create the private `.env`, then run `docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml pull` followed by `up -d`. Caddy terminates HTTPS and obtains Let’s Encrypt certificates automatically. Configure Cloudflare DNS, SSL `Full (strict)`, GHCR/GitHub Actions secrets, Resend, and OCI ingress rules before the first deploy. `scripts/prepare-oci.sh` prepares a fresh Ubuntu host and `scripts/backup-postgres.sh` creates a compressed database backup.
