"""Tests for the simplified 4-table database schema."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from plantdb.models import Base, DiseaseClass, ImageRecord, ModelEvaluation, Source
from plantdb.seed import seed_database


@pytest.fixture
def db_session():
    """In-memory SQLite session with foreign keys enabled."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    try:
        seed_database(session)
        yield session
    finally:
        session.close()


def test_seed_classes_and_sources(db_session):
    """Seed keeps the original catalogue and adds nine model-supported states."""
    classes = db_session.query(DiseaseClass).all()
    assert len(classes) == 34

    # Check 5 healthy classes
    healthy_classes = db_session.query(DiseaseClass).filter_by(is_healthy=True).all()
    assert len(healthy_classes) == 7
    assert {c.crop for c in healthy_classes} == {"Томат", "Картофель", "Огурец", "Яблоня", "Пшеница", "Сладкий перец", "Земляника"}

    # Check 20 disease classes
    diseases = db_session.query(DiseaseClass).filter_by(is_healthy=False).all()
    assert len(diseases) == 27

    # Check open sources
    sources = db_session.query(Source).all()
    assert len(sources) >= 3
    source_ids = {s.id for s in sources}
    assert "plantvillage" in source_ids
    assert "mendeley" in source_ids


def test_image_record_creation_and_relations(db_session):
    """Images can be linked to class and source, with model evaluation results."""
    image = ImageRecord(
        id="img_001",
        file_path="/data/images/tomato_early_blight_01.jpg",
        sha256="abc123sha256fake",
        phash="8f8f8f8f8f8f8f8f",
        class_id="tomato_early_blight",
        source_id="plantvillage",
        width=512,
        height=512,
        mime_type="image/jpeg",
        is_verified=True,
    )
    db_session.add(image)
    db_session.commit()

    # Query back
    stored = db_session.query(ImageRecord).filter_by(id="img_001").one()
    assert stored.disease_class.disease_name_en == "Early Blight"
    assert stored.source.name == "PlantVillage Dataset"

    # Add model evaluation result
    eval_result = ModelEvaluation(
        id="eval_001",
        model_name="MobileNetV3_PlantVillage",
        image_id=stored.id,
        predicted_class_id="tomato_early_blight",
        confidence=0.985,
        is_correct=True,
        inference_time_ms=14.2,
    )
    db_session.add(eval_result)
    db_session.commit()

    assert len(stored.evaluations) == 1
    assert stored.evaluations[0].is_correct is True


def test_duplicate_sha256_rejected(db_session):
    """Database uniquely enforces sha256 to prevent duplicate photo records."""
    img1 = ImageRecord(
        id="img_001",
        file_path="/path/1.jpg",
        sha256="identical_hash_12345",
        class_id="tomato_healthy",
        source_id="plantvillage",
        width=300,
        height=300,
        mime_type="image/jpeg",
    )
    img2 = ImageRecord(
        id="img_002",
        file_path="/path/2.jpg",
        sha256="identical_hash_12345",
        class_id="tomato_healthy",
        source_id="plantvillage",
        width=300,
        height=300,
        mime_type="image/jpeg",
    )
    db_session.add(img1)
    db_session.commit()

    db_session.add(img2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_invalid_class_rejected_by_foreign_key(db_session):
    """Inserting image with non-existent class_id must fail via foreign key."""
    bad_img = ImageRecord(
        id="img_bad",
        file_path="/path/bad.jpg",
        sha256="unique_hash_999",
        class_id="non_existent_crop_disease",
        source_id="plantvillage",
        width=300,
        height=300,
        mime_type="image/jpeg",
    )
    db_session.add(bad_img)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
