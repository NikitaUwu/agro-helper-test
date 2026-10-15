"""Simplified data contracts for PlantDB (Open Datasets & Model Evaluation)."""

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DiseaseClassRecord(BaseModel):
    """Catalog disease or healthy state class."""
    model_config = ConfigDict(frozen=True)

    id: str  # e.g., 'tomato_early_blight'
    crop: str  # 'Томат'
    crop_en: str  # 'Tomato'
    disease_name: str  # 'Альтернариоз'
    disease_name_en: str  # 'Early Blight'
    is_healthy: bool = False
    description: Optional[str] = None
    treatment_recommendations: Optional[str] = None


class SourceRecord(BaseModel):
    """Open dataset source and legal licensing."""
    model_config = ConfigDict(frozen=True)

    id: str  # 'plantvillage', 'mendeley'
    name: str
    url: Optional[str] = None
    license_type: str  # 'CC BY-SA 3.0', 'CC BY 4.0'
    attribution: str
    can_display: bool = True
    can_use_for_eval: bool = True


class QualityCheckResult(BaseModel):
    """Automated image quality verification."""
    is_valid: bool
    width: int = 0
    height: int = 0
    mime_type: str = ""
    sha256: str = ""
    phash: Optional[str] = None
    error: Optional[str] = None


class ImageRecordData(BaseModel):
    """Stored image asset record."""
    model_config = ConfigDict(frozen=True)

    id: str
    file_path: str
    sha256: str
    phash: Optional[str] = None
    class_id: str
    source_id: str
    original_filename: Optional[str] = None
    width: int
    height: int
    mime_type: str
    is_verified: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ModelEvalResult(BaseModel):
    """Candidate pre-trained model prediction result."""
    model_config = ConfigDict(frozen=True)

    id: str
    model_name: str
    image_id: str
    predicted_class_id: str
    confidence: float
    is_correct: bool
    inference_time_ms: Optional[float] = None
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IngestSummary(BaseModel):
    """Summary of batch image import."""
    total_found: int = 0
    imported: int = 0
    duplicates_skipped: int = 0
    quality_rejected: int = 0
    errors: list[dict[str, Any]] = Field(default_factory=list)
