# Forma Studio

A complete bilingual corporate website for a fictional architecture and interior design studio. English and Turkish pages share the same content, routes, and visual system.

## Getting started

```sh
npm install
npm run dev
```

Open http://localhost:3000 (redirects to `/en`). Turkish content starts at `/tr`. If Windows PowerShell blocks npm scripts, use `npm.cmd` instead of `npm`.

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
- `lib/content.js`: equivalent English and Turkish static content, project and article data, and image sources.
- `app/globals.css`: Tailwind entry point, design system, responsive layouts, and motion preferences.
- `public/icon.svg`: studio favicon.
- `postcss.config.mjs`: stylesheet build configuration.

Built with Next.js App Router, React, Tailwind CSS, and Lucide icons. No database or backend service is required.

## Demo limitations

Forma is a fictional company. Team profiles, project stories, statistics, and testimonials are illustrative. Photographs are served from Unsplash and require an internet connection; they are not claimed as original studio work. System typography avoids external font requests.

The contact form does not send messages, transmit personal information, or store submissions. It validates the entered details and displays a localized success message without sending anything or downloading a file. Connect a real submission service and replace the example company content before launching a real business site.
