"""Database connection and session factory."""

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from plantdb.models import Base
from plantdb.seed import seed_database

DEFAULT_DB_PATH = Path("./data/plantdb.sqlite3")


def get_database_url() -> str:
    """Get database URL from environment or default to local sqlite."""
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{DEFAULT_DB_PATH.resolve()}"


def init_db(database_url: str | None = None) -> sessionmaker[Session]:
    """Initialize database engine, create tables, and seed initial data."""
    url = database_url or get_database_url()
    engine = create_engine(url)
    Base.metadata.create_all(engine)

    factory = sessionmaker(bind=engine)
    with factory() as session:
        seed_database(session)

    return factory
