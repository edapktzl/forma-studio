# Forma Studio backend architecture

The repository uses a monorepo with a Next.js public web app, a separate Next.js admin app, and a FastAPI API backed by PostgreSQL. Public content is read through versioned API routes; admin writes are authenticated and use HttpOnly cookies. Project and contact models are the first vertical slice. Project translations require both `en` and `tr`. Uploaded files currently use the persistent API media volume; the database stores their metadata, and Cloudflare R2 remains the planned external storage adapter.
