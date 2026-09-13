import secrets
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .auth.rate_limit import rate_limiter
from .routers import auth, categories, contact, content, health, media, projects, dashboard

settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0")
@app.middleware("http")
async def browser_security(request: Request, call_next):
    path = request.url.path.rstrip("/")
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        if origin and origin not in settings.allowed_origins:
            return JSONResponse({"detail": "Origin not allowed."}, status_code=403)
        protected = path.startswith("/api/v1/admin/") or path in {"/api/v1/auth/refresh", "/api/v1/auth/logout"}
        if protected and (request.cookies.get("access_token") or request.cookies.get("refresh_token")):
            cookie, header = request.cookies.get("csrf_token", ""), request.headers.get("x-csrf-token", "")
            if not cookie or not header or not secrets.compare_digest(cookie, header):
                return JSONResponse({"detail": "CSRF validation failed."}, status_code=403)
    if request.method == "POST" and path in {"/api/v1/auth/login", "/api/v1/contact-messages"}:
        limit = settings.login_rate_limit if path.endswith("/login") else settings.contact_rate_limit
        client = request.client.host if request.client else "unknown"
        wait = rate_limiter.retry_after((path, client), limit, settings.rate_limit_window_seconds)
        if wait:
            return JSONResponse({"detail": "Too many requests. Please try again later."}, status_code=429,
                                headers={"Retry-After": str(wait), "Cache-Control": "no-store"})
    response = await call_next(request)
    if request.url.path.startswith(("/api/v1/admin/", "/api/v1/auth/")):
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(IntegrityError)
async def integrity_error(request, error):
    return JSONResponse({"detail": "This slug is already used, or a referenced record is unavailable."}, status_code=409)


app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "X-CSRF-Token"])
app.include_router(health.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(projects.category_router, prefix="/api/v1")
app.include_router(projects.admin_router, prefix="/api/v1")
app.include_router(contact.router, prefix="/api/v1")
app.include_router(contact.admin_router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(content.router, prefix="/api/v1")
app.include_router(content.admin_router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(categories.public_router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.mount("/media", StaticFiles(directory=settings.media_storage_path, check_dir=False), name="media")
