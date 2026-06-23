import sqlite3
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

SQLITE_PATH    = "test.db"  
POSTGRES_URL   = os.getenv("DATABASE_URL")

if POSTGRES_URL.startswith("postgres://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql://", 1)

if not os.path.exists(SQLITE_PATH):
    raise FileNotFoundError(f"Could not find {SQLITE_PATH} — update SQLITE_PATH in this script.")

sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_conn.row_factory = sqlite3.Row

pg_engine = create_engine(POSTGRES_URL)

TABLES_IN_ORDER = [
    "users",
    "journals",
    "daily_insights",
    "daily_insights_dashboard",
    "imported_entries",
    "entry_embeddings",
    "chat_sessions",
    "chat_messages",
]


def get_sqlite_rows(table_name):
    try:
        cursor = sqlite_conn.execute(f"SELECT * FROM {table_name}")
        return [dict(row) for row in cursor.fetchall()]
    except sqlite3.OperationalError:
        print(f"  Table '{table_name}' not found in SQLite — skipping.")
        return []


def migrate_table(table_name):
    rows = get_sqlite_rows(table_name)
    if not rows:
        print(f"  {table_name}: 0 rows to migrate")
        return

    with pg_engine.connect() as conn:
        # Check if data already exists to avoid duplicate migration
        existing_count = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
        if existing_count > 0:
            print(f"  {table_name}: already has {existing_count} rows in Postgres — skipping to avoid duplicates")
            return

        columns      = list(rows[0].keys())
        column_names = ", ".join(columns)
        placeholders = ", ".join([f":{col}" for col in columns])

        insert_stmt = text(f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})")

        for row in rows:
            # Convert any None/empty embedding JSON properly, leave other types as-is
            conn.execute(insert_stmt, row)

        conn.commit()
        print(f"  {table_name}: migrated {len(rows)} rows ✓")


def reset_sequences():
    with pg_engine.connect() as conn:
        for table in TABLES_IN_ORDER:
            try:
                conn.execute(text(f"""
                    SELECT setval(
                        pg_get_serial_sequence('{table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM {table}), 1)
                    )
                """))
            except Exception as e:
                print(f"  Could not reset sequence for {table}: {e}")
        conn.commit()
    print("Sequences reset ✓")


if __name__ == "__main__":
    print("Starting migration: SQLite → Postgres\n")

    for table in TABLES_IN_ORDER:
        print(f"Migrating {table}...")
        migrate_table(table)

    print("\nResetting auto-increment sequences...")
    reset_sequences()

    sqlite_conn.close()
    print("\n✅ Migration complete! Verify your data in Postgres before deleting the SQLite file.")