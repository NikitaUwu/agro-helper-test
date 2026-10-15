"""Tests for the image ingestion pipeline."""

from pathlib import Path
from PIL import Image
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from plantdb.ingest import ingest_directory, ingest_image_file
from plantdb.models import Base, ImageRecord
from plantdb.seed import seed_database


@pytest.fixture
def db_session():
    """In-memory SQLite session seeded with classes and sources."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    try:
        seed_database(session)
        yield session
    finally:
        session.close()


@pytest.fixture
def sample_dataset_dir(tmp_path: Path):
    """Create a sample folder structure mimicking PlantVillage dataset."""
    root = tmp_path / "dataset"
    root.mkdir()

    # 1. Tomato early blight folder
    tomato_dir = root / "Tomato___Early_blight"
    tomato_dir.mkdir()
    img1 = Image.new("RGB", (256, 256), color=(100, 50, 20))
    img1.save(tomato_dir / "tomato_eb_01.jpg", format="JPEG")
    img2 = Image.new("RGB", (256, 256), color=(120, 60, 25))
    img2.save(tomato_dir / "tomato_eb_02.jpg", format="JPEG")

    # 2. Too small image
    img_bad = Image.new("RGB", (100, 100), color=(50, 50, 50))
    img_bad.save(tomato_dir / "bad_small.jpg", format="JPEG")

    # 3. Healthy potato folder
    potato_dir = root / "Potato___healthy"
    potato_dir.mkdir()
    img3 = Image.new("RGB", (256, 256), color=(20, 150, 20))
    img3.save(potato_dir / "potato_h_01.jpg", format="JPEG")

    return root


def test_ingest_directory_end_to_end(db_session, sample_dataset_dir):
    """Test importing directory with auto-detected classes and duplicate protection."""
    summary = ingest_directory(
        session=db_session,
        dir_path=sample_dataset_dir,
        source_id="plantvillage",
        min_dimension=224,
    )

    assert summary.total_found == 4
    assert summary.imported == 3  # 2 tomato + 1 potato
    assert summary.quality_rejected == 1  # 1 small image

    # Check records in DB
    records = db_session.query(ImageRecord).all()
    assert len(records) == 3

    classes_imported = {r.class_id for r in records}
    assert classes_imported == {"tomato_early_blight", "potato_healthy"}

    # Re-importing same directory must be idempotent (all skipped as duplicates)
    second_summary = ingest_directory(
        session=db_session,
        dir_path=sample_dataset_dir,
        source_id="plantvillage",
        min_dimension=224,
    )
    assert second_summary.imported == 0
    assert second_summary.duplicates_skipped == 3
    assert len(db_session.query(ImageRecord).all()) == 3
