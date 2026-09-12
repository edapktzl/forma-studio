from fastapi.testclient import TestClient

from app.main import app


def test_health_and_contract_routes():
    with TestClient(app) as client:
        assert client.get("/api/v1/health").json() == {"status": "ok", "service": "forma-api"}
        paths = client.get("/openapi.json").json()["paths"]
        for path in (
            "/api/v1/projects",
            "/api/v1/contact-messages",
            "/api/v1/admin/contact-messages",
            "/api/v1/articles",
            "/api/v1/testimonials",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/project-categories",
            "/api/v1/admin/projects",
            "/api/v1/admin/articles",
            "/api/v1/admin/testimonials",
            "/api/v1/admin/media",
        ):
            assert path in paths
