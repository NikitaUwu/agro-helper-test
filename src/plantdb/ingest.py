"""Batch ingestion pipeline for open dataset images."""

from pathlib import Path
from typing import Callable, Dict, Optional
import uuid

from sqlalchemy.orm import Session

from plantdb.contracts import IngestSummary
from plantdb.models import DiseaseClass, ImageRecord, Source
from plantdb.quality import inspect_image
from plantdb.registry import model_labels


# Mapping typical PlantVillage / Kaggle directory names to our class_id
PLANTVILLAGE_FOLDER_MAP: Dict[str, str] = {
    # Tomato
    "Tomato___healthy": "tomato_healthy",
    "Tomato___Early_blight": "tomato_early_blight",
    "Tomato___Late_blight": "tomato_late_blight",
    "Tomato___Septoria_leaf_spot": "tomato_septoria_leaf_spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "tomato_yellow_leaf_curl",
    # Potato
    "Potato___healthy": "potato_healthy",
    "Potato___Early_blight": "potato_early_blight",
    "Potato___Late_blight": "potato_late_blight",
    # Cucumber
    "Cucumber___healthy": "cucumber_healthy",
    # Apple
    "Apple___healthy": "apple_healthy",
    "Apple___Apple_scab": "apple_scab",
    "Apple___Black_rot": "apple_black_rot",
    "Apple___Cedar_apple_rust": "apple_cedar_rust",
}


PLANTVILLAGE_FOLDER_MAP.update({item['rawLabel']: item['conditionId'] for item in model_labels() if item['enabled']})


def resolve_class_id_from_path(file_path: Path) -> Optional[str]:
    """Infer class_id from parent folder name or filename prefix."""
    parent_name = file_path.parent.name
    if parent_name in PLANTVILLAGE_FOLDER_MAP:
        return PLANTVILLAGE_FOLDER_MAP[parent_name]

    # Check direct match with known class_ids
    stem = parent_name.lower().replace("-", "_").replace(" ", "_")
    return stem if stem else None


def ingest_image_file(
    session: Session,
    file_path: Path | str,
    source_id: str,
    class_id: Optional[str] = None,
    min_dimension: int = 224,
) -> tuple[Optional[ImageRecord], Optional[str]]:
    """Inspect and ingest a single image into the database.

    Returns (ImageRecord, None) on success,
    or (None, "duplicate" | "quality_rejected" | error_message) on failure.
    """
    path = Path(file_path)
    if not class_id:
        class_id = resolve_class_id_from_path(path)

    if not class_id:
        return None, f"Cannot determine class_id for {path.name}"

    # Verify class_id exists in DB
    cls_obj = session.query(DiseaseClass).filter_by(id=class_id).first()
    if not cls_obj:
        return None, f"Class '{class_id}' not found in catalog"

    # Quality inspection
    quality = inspect_image(path, min_dimension=min_dimension)
    if not quality.is_valid:
        return None, f"quality_rejected: {quality.error}"

    # Check for exact duplicate via SHA-256
    existing = session.query(ImageRecord).filter_by(sha256=quality.sha256).first()
    if existing:
        return None, "duplicate"

    # Insert new ImageRecord
    record = ImageRecord(
        id=str(uuid.uuid4()),
        file_path=str(path.resolve()),
        sha256=quality.sha256,
        phash=quality.phash,
        class_id=class_id,
        source_id=source_id,
        original_filename=path.name,
        width=quality.width,
        height=quality.height,
        mime_type=quality.mime_type,
        is_verified=True,
    )
    session.add(record)
    session.commit()
    return record, None


def ingest_directory(
    session: Session,
    dir_path: Path | str,
    source_id: str,
    default_class_id: Optional[str] = None,
    min_dimension: int = 224,
) -> IngestSummary:
    """Ingest all supported images from a directory recursively."""
    directory = Path(dir_path)
    summary = IngestSummary()

    if not directory.exists() or not directory.is_dir():
        summary.errors.append({"path": str(directory), "error": "Directory does not exist"})
        return summary

    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    image_files = [f for f in directory.rglob("*") if f.is_file() and f.suffix.lower() in image_extensions]
    summary.total_found = len(image_files)

    for img_path in image_files:
        target_class = default_class_id or resolve_class_id_from_path(img_path)
        record, err = ingest_image_file(
            session=session,
            file_path=img_path,
            source_id=source_id,
            class_id=target_class,
            min_dimension=min_dimension,
        )

        if record:
            summary.imported += 1
        elif err == "duplicate":
            summary.duplicates_skipped += 1
        elif err and err.startswith("quality_rejected"):
            summary.quality_rejected += 1
            summary.errors.append({"file": img_path.name, "reason": err})
        else:
            summary.errors.append({"file": img_path.name, "reason": err or "unknown error"})

    return summary
