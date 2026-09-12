"""Exercise the running local PostgreSQL/API stack. Creates isolated data and cleans it up."""
import base64
import json
from pathlib import Path
import secrets
import struct
import subprocess
import sys
import zlib
import httpx

ROOT = Path(__file__).resolve().parents[1]
manifest = ROOT / "storage/admin-check-records.json"
records = []
def cleanup():
    if not records: return
    code = """
import asyncio, json, sys
from pathlib import Path
from sqlalchemy import delete
from app.database import SessionLocal
from app.config import get_settings
from app.models import Project, Article, Testimonial, MediaFile, ProjectCategory, BlogCategory, ContactMessage
models = {m.__tablename__:m for m in (Project, Article, Testimonial, MediaFile, ProjectCategory, BlogCategory, ContactMessage)}
async def main():
    assert get_settings().environment == 'development'
    async with SessionLocal() as db:
        for table, identifier in reversed(json.load(sys.stdin)):
            model = models[table]
            if table == 'media_files':
                row = await db.get(model, identifier)
                if row:
                    root = Path(get_settings().media_storage_path).resolve()
                    path = (root / row.storage_key).resolve()
                    if path.parent == root: path.unlink(missing_ok=True)
            await db.execute(delete(model).where(model.id == identifier))
        await db.commit()
asyncio.run(main())
"""
    docker = r"C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    subprocess.run([docker, "compose", "--env-file", ".env", "-f", "infra/docker-compose.yml", "exec", "-T", "api", "python", "-c", code],
        cwd=ROOT, input=json.dumps(records), text=True, check=True)
    manifest.unlink(missing_ok=True)

if "--cleanup" in sys.argv:
    records = json.loads(manifest.read_text()) if manifest.exists() else []
    cleanup()
    raise SystemExit()

def png():
    def chunk(name, data):
        return struct.pack("!I", len(data)) + name + data + struct.pack("!I", zlib.crc32(name + data))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack("!2I5B",32,32,8,2,0,0,0)) + chunk(b"IDAT",zlib.compress((b"\0"+bytes([120,145,102])*32)*32)) + chunk(b"IEND",b"")

prefix = "workspace-check-" + secrets.token_hex(4)
credentials = json.loads((ROOT / ".env.admin.local").read_text())
try:
    with httpx.Client(base_url="http://localhost:8000/api/v1", timeout=30, trust_env=False) as client:
        def request(method,path,expected=200,**kwargs):
            result = client.request(method,path,**kwargs)
            assert result.status_code == expected, (method,path,result.status_code,result.text[:500])
            return result.json() if result.content else None
        def create(table,path,payload=None,files=None):
            item = request("POST",path,201,**({"files":files} if files else {"json":payload}))
            records.append((table,item["id"]))
            manifest.write_text(json.dumps(records))
            return item
        assert client.get("/admin/dashboard").status_code == 401
        request("POST","/auth/login",json={k:credentials[k] for k in ("email","password")})
        csrf = request("GET","/auth/csrf")["csrf_token"]
        client.headers["X-CSRF-Token"] = csrf
        request("GET","/admin/dashboard")
        assert client.post("/admin/projects",json={},headers={"X-CSRF-Token":"wrong"}).status_code==403
        assert client.post("/admin/projects",json={},headers={"Origin":"https://attacker.example"}).status_code==403

        category = create("project_categories","/admin/project-categories",{"slug":prefix,"translations":{"en":{"name":"Test category"},"tr":{"name":"Deneme kategorisi"}}})
        blog_category = create("blog_categories","/admin/blog-categories",{"slug":prefix,"translations":{"en":{"name":"Test journal"},"tr":{"name":"Deneme yazıları"}}})
        media = create("media_files","/admin/media",files={"file":("check.png",png(),"image/png")})
        assert client.post("/admin/media",files={"file":("bad.png",b"not an image","image/png")}).status_code==422
        assert client.post("/admin/media",files={"file":("bad.php",png(),"image/png")}).status_code==415
        request("PATCH","/admin/media/"+str(media["id"]),json={"alt_text":"A local test photograph"})
        def tr(title):
            return {"title":title,"concept":"Architecture","short_description":"A bilingual project.","description":"A complete project story."}
        payload={"slug":prefix,"category_id":category["id"],"location":"Istanbul","area_sqm":120,"construction_year":2025,"translations":{"en":tr("Test project"),"tr":tr("Deneme projesi")},"status":"draft"}
        project=create("projects","/admin/projects",payload)
        assert client.get("/projects/"+prefix).status_code==404
        assert client.patch("/admin/projects/"+str(project["id"])+"/publish").status_code==422
        payload.update(status="published",is_featured=True,images=[{"media_id":media["id"],"alt_text":"Test photo","is_cover":True}])
        request("PUT","/admin/projects/"+str(project["id"]),json=payload)
        assert request("GET","/projects/"+prefix+"?language=tr")["title"]=="Deneme projesi"
        assert any(x["slug"]==prefix for x in request("GET","/projects?featured=true")["items"])
        for language, title in (("en", "Test project"), ("tr", "Deneme projesi")):
            page = httpx.get(f"http://localhost:3000/{language}/projects/{prefix}", timeout=30, trust_env=False, follow_redirects=True)
            assert page.status_code == 200 and title in page.text, ("public project page", language, page.status_code)
        assert client.post("/admin/projects",json=payload).status_code==409
        assert client.delete("/admin/media/"+str(media["id"])).status_code==409
        bad=dict(payload,translations={"en":tr("English only")})
        assert client.put("/admin/projects/"+str(project["id"]),json=bad).status_code==422

        article_payload={"slug":prefix,"category_id":blog_category["id"],"cover_media_id":media["id"],"status":"published","translations":{lang:{"title":"Article "+lang,"excerpt":"A short journal introduction.","content_html":'<h2>Safe heading</h2><p>Text</p><script>alert(1)</script><a href="javascript:alert(1)">Link</a>'} for lang in ("en","tr")}}
        article=create("articles","/admin/articles",article_payload)
        empty_article = {**article_payload, "translations": {language: {**translation, "content_html": "<p><br></p>"} for language, translation in article_payload["translations"].items()}}
        assert client.put("/admin/articles/"+str(article["id"]), json=empty_article).status_code == 422
        result=request("GET","/articles/"+prefix+"?language=en")
        assert "<script" not in result["content_html"] and "javascript:" not in result["content_html"]
        for language in ("en", "tr"):
            page = httpx.get(f"http://localhost:3000/{language}/insights/{prefix}", timeout=30, trust_env=False, follow_redirects=True)
            assert page.status_code == 200 and f"Article {language}" in page.text and "Safe heading" in page.text, ("public article page", language, page.status_code)
        request("PATCH","/admin/articles/"+str(article["id"])+"/unpublish")
        assert client.get("/articles/"+prefix).status_code==404
        request("PATCH","/admin/articles/"+str(article["id"])+"/publish")
        testimonial_payload={"client_name":"Test client","rating":5,"avatar_media_id":media["id"],"status":"published","translations":{"en":{"quote":"Thoughtful work."},"tr":{"quote":"Özenli bir çalışma."}}}
        testimonial=create("testimonials","/admin/testimonials",testimonial_payload)
        assert any(t["id"]==testimonial["id"] for t in request("GET","/testimonials?language=tr"))
        assert client.put("/admin/testimonials/"+str(testimonial["id"]),json=dict(testimonial_payload,rating=6)).status_code==422
        request("PATCH","/admin/testimonials/"+str(testimonial["id"])+"/hide")
        assert not any(t["id"]==testimonial["id"] for t in request("GET","/testimonials"))

        contact=create("contact_messages","/contact-messages",{"first_name":"Local","last_name":"Test","email":"installation@example.com","subject":"Admin integration test","message":"This is a synthetic local verification message."})
        message=request("PATCH","/admin/contact-messages/"+str(contact["id"])+"/read")
        assert message["status"]=="read"
        request("PATCH","/admin/contact-messages/"+str(contact["id"])+"/unread")
        request("PATCH","/admin/contact-messages/"+str(contact["id"])+"/archive")
        request("DELETE","/admin/contact-messages/"+str(contact["id"]),204)
        request("DELETE","/admin/projects/"+str(project["id"]),204)
        assert client.get("/projects/"+prefix).status_code==404

        old_refresh=client.cookies.get("refresh_token")
        request("POST","/auth/refresh")
        assert client.cookies.get("refresh_token") != old_refresh
        request("POST","/auth/logout",204)
        assert client.post("/auth/refresh").status_code==401
        print("PASS: bilingual CRUD, publication, images, sanitizer, messages, CSRF and refresh rotation.")
finally:
    cleanup()
