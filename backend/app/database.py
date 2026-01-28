import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./m2go.db")
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema():
    # Lightweight fallback for older SQLite files without new columns.
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return
    with engine.begin() as conn:
        tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        table_names = {row[0] for row in tables}

        if "daily_counts" in table_names:
            cols = conn.execute(text("PRAGMA table_info(daily_counts)")).fetchall()
            col_names = {row[1] for row in cols}

            if "prev_on_hand" not in col_names:
                conn.execute(text("ALTER TABLE daily_counts ADD COLUMN prev_on_hand FLOAT"))
            if "adjustment" not in col_names:
                conn.execute(text("ALTER TABLE daily_counts ADD COLUMN adjustment FLOAT"))

        if "products" in table_names:
            cols = conn.execute(text("PRAGMA table_info(products)")).fetchall()
            col_names = {row[1] for row in cols}
            if "sort_order" not in col_names:
                conn.execute(text("ALTER TABLE products ADD COLUMN sort_order INTEGER"))

        if "variants" in table_names:
            cols = conn.execute(text("PRAGMA table_info(variants)")).fetchall()
            col_names = {row[1] for row in cols}
            if "sort_order" not in col_names:
                conn.execute(text("ALTER TABLE variants ADD COLUMN sort_order INTEGER"))
