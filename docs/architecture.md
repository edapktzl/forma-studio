# Forma Studio backend architecture

The repository is moving toward a monorepo with a Next.js public web app, a separate Next.js admin app, and a FastAPI API backed by PostgreSQL. Public content is read through versioned API routes; admin writes are authenticated and use HttpOnly cookies. Project and contact models are the first vertical slice. Project translations require both `en` and `tr`, while files are represented by database metadata and will be stored in Cloudflare R2.
