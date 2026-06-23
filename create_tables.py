"""
CREATE TABLES IN POSTGRES
═══════════════════════════════════════════════════════════════════════════
Run this BEFORE migrate_to_postgres.py — it creates all your tables
(empty) in Postgres using your existing SQLAlchemy models, so the
migration script has somewhere to insert data into.

USAGE:
    python create_tables.py
"""

from database import Base, engine
import models  # noqa: F401 — importing registers all model classes with Base

print("Creating all tables in Postgres...")
Base.metadata.create_all(bind=engine)
print("✅ Tables created.")