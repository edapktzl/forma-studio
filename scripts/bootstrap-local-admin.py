"""Create a local admin without putting its password in command-line arguments."""
import json
from pathlib import Path
import secrets
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CREDENTIALS = ROOT / '.env.admin.local'
docker = shutil.which('docker') or r'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
if not CREDENTIALS.exists():
    CREDENTIALS.write_text(json.dumps({
        'email': 'admin@forma-studio.com',
        'password': secrets.token_urlsafe(24),
        'full_name': 'Local Administrator',
    }, indent=2) + '\n', encoding='utf-8')

code = '''
import asyncio, json, sys
from sqlalchemy import select
from app.config import get_settings
from app.database import SessionLocal
from app.models import AdminUser
from app.auth.security import hash_password, verify_password
async def main():
    if get_settings().environment != 'development':
        raise SystemExit('This bootstrap is restricted to local development.')
    data = json.load(sys.stdin)
    async with SessionLocal() as db:
        user = await db.scalar(select(AdminUser).where(AdminUser.email == data['email']))
        if user:
            if not verify_password(data['password'], user.password_hash):
                raise SystemExit('Existing account preserved; credentials do not match.')
        else:
            db.add(AdminUser(email=data['email'], password_hash=hash_password(data['password']), full_name=data['full_name'], role='admin'))
            await db.commit()
    print('Local administrator ready.')
asyncio.run(main())
'''
subprocess.run([
    docker, 'compose', '--env-file', '.env', '-f', 'infra/docker-compose.yml',
    'exec', '-T', 'api', 'python', '-c', code,
], cwd=ROOT, input=CREDENTIALS.read_text(encoding='utf-8'), text=True, check=True)
print('Login credentials are saved in .env.admin.local (excluded from Git).')
