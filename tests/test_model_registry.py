from pathlib import Path
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from plantdb.models import Base, DiseaseClass
from plantdb.seed import seed_database
from plantdb.ingest import PLANTVILLAGE_FOLDER_MAP
from plantdb.downloader import DEFAULT_TARGET_CLASSES


def test_shared_model_registry_seed_and_imports_are_consistent():
    registry = json.loads((Path(__file__).resolve().parents[1] / 'config/model_labels.json').read_text(encoding='utf-8'))
    active = [item for item in registry['labels'] if item['enabled']]
    assert len(active) == 21
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        seed_database(session)
        ids = {row.id for row in session.query(DiseaseClass).all()}
        assert len(ids) == 34
        assert {item['conditionId'] for item in active} <= ids
        assert {'cucumber_healthy', 'wheat_healthy', 'potato_common_scab', 'apple_powdery_mildew'} <= ids
        for item in active:
            assert PLANTVILLAGE_FOLDER_MAP[item['rawLabel']] == item['conditionId']
            assert item['rawLabel'] in DEFAULT_TARGET_CLASSES
        assert seed_database(session) == (0, 0)
