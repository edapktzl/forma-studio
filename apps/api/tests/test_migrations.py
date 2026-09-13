"""Check that the real Alembic environment can generate the initial PostgreSQL schema."""
from pathlib import Path
from subprocess import run
import os
import sys


def test_initial_migration_can_generate_postgresql_sql():
    api_root = Path(__file__).resolve().parents[1]
    result = run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=api_root,
        env={**os.environ, "DATABASE_URL": "postgresql+psycopg://test:test@localhost/test"},
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE projects" in result.stdout
    assert "CREATE TABLE project_translations" in result.stdout
    assert "INSERT INTO project_categories" in result.stdout
    assert "Konut" in result.stdout
    assert "COMMIT;" in result.stdout
