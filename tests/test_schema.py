"""Tests for database schema, constraints, foreign keys, and relations."""

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from plantdb.models import (
    Annotation,
    Asset,
    AssetSource,
    Base,
    Condition,
    ConditionHost,
    ConditionPathogen,
    Observation,
    Right,
    Source,
    Taxon,
)


@pytest.fixture
def db_session():
    """In-memory SQLite database session with foreign keys enabled."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_invalid_host_reference_rejected(db_session: Session):
    """Unknown host UUID must be rejected by foreign key constraint."""
    non_existent_host_id = uuid.uuid4()
    obs = Observation(
        id=uuid.uuid4(),
        anonymized_code="OBS_TEST_001",
        host_taxon_id=non_existent_host_id,
    )
    db_session.add(obs)

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_duplicate_origin_preserved(db_session: Session):
    """An asset stored once preserves multiple origins in asset_sources."""
    # 1. Setup host taxon
    host = Taxon(
        id=uuid.uuid4(),
        taxon_type="host",
        canonical_name="Solanum lycopersicum",
        common_name_ru="Томат",
    )
    db_session.add(host)

    # 2. Setup rights
    right_1 = Right(
        id=uuid.uuid4(),
        rights_holder="Author 1",
        license="CC BY-SA 3.0",
        evidence="evidence/1.txt",
        can_store=True,
        can_display=True,
        attribution="Author 1",
        reviewer="curator_1",
        status="approved",
    )
    right_2 = Right(
        id=uuid.uuid4(),
        rights_holder="Author 2",
        license="CC BY 4.0",
        evidence="evidence/2.txt",
        can_store=True,
        can_display=False,
        attribution="Author 2",
        reviewer="curator_2",
        status="pending",
    )
    db_session.add_all([right_1, right_2])

    # 3. Setup sources
    source_1 = Source(
        id=uuid.uuid4(),
        name="PlantVillage",
        version="1.0",
        access_method="download",
    )
    source_2 = Source(
        id=uuid.uuid4(),
        name="Field Archive 2026",
        version="2.0",
        access_method="upload",
    )
    db_session.add_all([source_1, source_2])

    # 4. Create one master asset
    asset = Asset(
        id=uuid.uuid4(),
        original_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        pixel_sha256="d41d8cd98f00b204e9800998ecf8427e",
        storage_key="originals/tomato_leaf_01.jpg",
        width=1024,
        height=768,
        mime="image/jpeg",
    )
    db_session.add(asset)
    db_session.commit()

    # 5. Link both origins to the single asset
    origin_1 = AssetSource(
        id=uuid.uuid4(),
        asset_id=asset.id,
        source_id=source_1.id,
        rights_id=right_1.id,
        external_id="PV_TOMATO_001",
        original_label="Tomato___Early_blight",
    )
    origin_2 = AssetSource(
        id=uuid.uuid4(),
        asset_id=asset.id,
        source_id=source_2.id,
        rights_id=right_2.id,
        external_id="FIELD_2026_TOM_99",
        original_label="Томат альтернариоз поле",
    )
    db_session.add_all([origin_1, origin_2])
    db_session.commit()

    # Verify: 1 asset, 2 asset_sources
    stored_asset = db_session.query(Asset).filter_by(id=asset.id).one()
    assert len(stored_asset.sources) == 2
    source_names = {s.source.name for s in stored_asset.sources}
    assert source_names == {"PlantVillage", "Field Archive 2026"}
    rights_holders = {s.right.rights_holder for s in stored_asset.sources}
    assert rights_holders == {"Author 1", "Author 2"}


def test_unique_original_sha256_constraint(db_session: Session):
    """Duplicate original_sha256 in assets table must be rejected."""
    sha = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899"
    asset1 = Asset(
        id=uuid.uuid4(),
        original_sha256=sha,
        pixel_sha256="pix1",
        storage_key="key1.jpg",
        width=500,
        height=500,
        mime="image/jpeg",
    )
    asset2 = Asset(
        id=uuid.uuid4(),
        original_sha256=sha,
        pixel_sha256="pix2",
        storage_key="key2.jpg",
        width=500,
        height=500,
        mime="image/jpeg",
    )
    db_session.add(asset1)
    db_session.commit()

    db_session.add(asset2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_pathogen_does_not_merge_conditions(db_session: Session):
    """Two conditions sharing the same pathogen must be stored separately with their respective hosts."""
    # Common pathogen: Alternaria solani
    pathogen = Taxon(
        id=uuid.uuid4(),
        taxon_type="pathogen",
        canonical_name="Alternaria solani",
        eppo_code="ALTESO",
    )
    # Distinct hosts
    tomato = Taxon(
        id=uuid.uuid4(),
        taxon_type="host",
        canonical_name="Solanum lycopersicum",
        common_name_ru="Томат",
        eppo_code="LYCES",
    )
    potato = Taxon(
        id=uuid.uuid4(),
        taxon_type="host",
        canonical_name="Solanum tuberosum",
        common_name_ru="Картофель",
        eppo_code="SOLTU",
    )
    db_session.add_all([pathogen, tomato, potato])
    db_session.commit()

    # Condition 1: Tomato early blight
    cond_tomato = Condition(
        id=uuid.uuid4(),
        name="Альтернариоз томата",
        condition_type="disease",
    )
    # Condition 2: Potato early blight
    cond_potato = Condition(
        id=uuid.uuid4(),
        name="Альтернариоз картофеля",
        condition_type="disease",
    )
    db_session.add_all([cond_tomato, cond_potato])
    db_session.commit()

    # Link condition to host
    db_session.add_all([
        ConditionHost(condition_id=cond_tomato.id, host_taxon_id=tomato.id),
        ConditionHost(condition_id=cond_potato.id, host_taxon_id=potato.id),
        ConditionPathogen(condition_id=cond_tomato.id, pathogen_taxon_id=pathogen.id),
        ConditionPathogen(condition_id=cond_potato.id, pathogen_taxon_id=pathogen.id),
    ])
    db_session.commit()

    # Verify both conditions remain distinct entities
    assert cond_tomato.id != cond_potato.id
    c1 = db_session.query(Condition).filter_by(id=cond_tomato.id).one()
    c2 = db_session.query(Condition).filter_by(id=cond_potato.id).one()

    assert len(c1.hosts) == 1
    assert c1.hosts[0].host_taxon.canonical_name == "Solanum lycopersicum"
    assert len(c2.hosts) == 1
    assert c2.hosts[0].host_taxon.canonical_name == "Solanum tuberosum"

    # Both reference the same pathogen
    assert c1.pathogens[0].pathogen_taxon.canonical_name == "Alternaria solani"
    assert c2.pathogens[0].pathogen_taxon.canonical_name == "Alternaria solani"
