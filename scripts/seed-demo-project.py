"""Create one bilingual demo project through the admin API.

The script is deliberately idempotent: it checks the slug first and never
deletes or edits an existing project. Credentials are supplied through the
environment so they are never committed to the repository.

PowerShell example:
  $env:FORMA_ADMIN_EMAIL='admin@example.com'
  $env:FORMA_ADMIN_PASSWORD='...'
  python scripts/seed-demo-project.py
"""

import os
import sys
from pathlib import Path
import httpx


API = os.getenv("FORMA_API_URL", "http://localhost:8000/api/v1").rstrip("/")
EMAIL = os.getenv("FORMA_ADMIN_EMAIL")
PASSWORD = os.getenv("FORMA_ADMIN_PASSWORD")
SLUG = "cedar-courtyard-demo"

IMAGE_URLS = [
    "https://images.pexels.com/photos/12700453/pexels-photo-12700453.jpeg?auto=compress&cs=tinysrgb&w=2400&q=90",
    "https://images.pexels.com/photos/24285883/pexels-photo-24285883.jpeg?auto=compress&cs=tinysrgb&w=2400&q=90",
    "https://images.pexels.com/photos/35173051/pexels-photo-35173051.jpeg?auto=compress&cs=tinysrgb&w=2400&q=90",
]


def request(client, method, path, expected=200, **kwargs):
    response = client.request(method, path, **kwargs)
    if response.status_code != expected:
        raise RuntimeError(f"{method} {path} returned {response.status_code}: {response.text[:500]}")
    return response.json() if response.content else None


def main():
    if not EMAIL or not PASSWORD:
        raise SystemExit("Set FORMA_ADMIN_EMAIL and FORMA_ADMIN_PASSWORD before running the seeder.")
    with httpx.Client(base_url=API, timeout=60, trust_env=False, follow_redirects=True) as client:
        request(client, "POST", "/auth/login", json={"email": EMAIL, "password": PASSWORD})
        csrf = request(client, "GET", "/auth/csrf")["csrf_token"]
        client.headers["X-CSRF-Token"] = csrf
        existing = request(client, "GET", "/admin/projects")
        if any(item.get("slug") == SLUG for item in existing):
            print(f"Demo project already exists: {SLUG}")
            return

        categories = request(client, "GET", "/admin/project-categories")
        category = next((item for item in categories if item.get("slug") == "residential"), None) or (categories[0] if categories else None)
        if not category:
            raise RuntimeError("Create a project category in the admin panel before running the seeder.")

        media = []
        for index, image_url in enumerate(IMAGE_URLS, start=1):
            image = httpx.get(image_url, timeout=60, trust_env=False)
            image.raise_for_status()
            uploaded = request(client, "POST", "/admin/media", expected=201, files={"file": (f"cedar-courtyard-pexels-{index}.jpg", image.content, "image/jpeg")})
            media.append(uploaded)

        video_media = None
        video_path = os.getenv("FORMA_DEMO_VIDEO")
        if video_path:
            path = Path(video_path)
            if not path.is_file():
                raise RuntimeError(f"FORMA_DEMO_VIDEO does not exist: {path}")
            video_media = request(client, "POST", "/admin/media", expected=201, files={"file": (path.name, path.read_bytes(), "video/mp4")})

        content = {
            "slug": SLUG,
            "category_id": category["id"],
            "location": "Urla, Izmir",
            "area_sqm": 280,
            "construction_year": 2025,
            "is_featured": True,
            "status": "published",
            "translations": {
                "en": {
                    "title": "Cedar Courtyard",
                    "concept": "Residential · Architecture and interiors",
                    "short_description": "A calm courtyard house shaped by shade, stone and local olive trees.",
                    "description": "Cedar Courtyard organizes daily life around a planted central garden, balancing privacy with long views across the landscape.",
                    "challenge": "Create a generous home on a compact coastal plot without losing the feeling of openness.",
                    "approach": "Deep reveals, tactile stone and a restrained material palette make the courtyard feel cool and connected.",
                    "outcome": "A durable family home with soft transitions between inside and outside.",
                },
                "tr": {
                    "title": "Sedir Avlu",
                    "concept": "Konut · Mimari ve iç mekân",
                    "short_description": "Gölge, taş ve yerel zeytin ağaçlarıyla şekillenen sakin bir avlu evi.",
                    "description": "Sedir Avlu, günlük yaşamı bitkili bir iç bahçe etrafında kurgular; mahremiyeti manzaraya açılan uzun bakışlarla dengeler.",
                    "challenge": "Kıyıdaki sınırlı parselde açıklık hissini koruyan cömert bir ev tasarlamak.",
                    "approach": "Derin söveler, dokulu taş ve yalın malzeme paleti avluyu serin ve çevresiyle bağlantılı kılar.",
                    "outcome": "İç ve dış arasında yumuşak geçişler kuran, uzun ömürlü bir aile evi.",
                },
            },
            "images": [{"media_id": item["id"], "alt_text": "Cedar Courtyard project photograph", "is_cover": index == 1} for index, item in enumerate(media, start=1)],
        }
        if video_media:
            content["video_media_id"] = video_media["id"]
        result = request(client, "POST", "/admin/projects", expected=201, json=content)
        suffix = " and one hero video" if video_media else ""
        print(f"Created demo project {result['id']} ({SLUG}) with {len(media)} high-resolution Pexels photographs{suffix}.")


if __name__ == "__main__":
    try:
        main()
    except (httpx.HTTPError, RuntimeError) as error:
        print(f"Seeder failed: {error}", file=sys.stderr)
        raise SystemExit(1)
