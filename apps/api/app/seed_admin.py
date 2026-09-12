import asyncio
import sys
from sqlalchemy import select
from .auth.security import hash_password
from .database import SessionLocal
from .models import AdminUser

async def main():
    if len(sys.argv) != 4:
        raise SystemExit("Usage: python -m app.seed_admin EMAIL PASSWORD FULL_NAME")
    email, password, full_name = sys.argv[1:]
    async with SessionLocal() as db:
        if await db.scalar(select(AdminUser).where(AdminUser.email == email)):
            raise SystemExit("Admin email already exists")
        db.add(AdminUser(email=email, password_hash=hash_password(password), full_name=full_name, role="admin"))
        await db.commit()
    print(f"Created admin {email}")

if __name__ == "__main__":
    asyncio.run(main())
