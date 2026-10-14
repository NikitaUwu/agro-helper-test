"""Data contracts and schemas for PlantDB."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Purpose(str, Enum):
    """Release purpose."""
    GALLERY = "gallery"
    COMMERCIAL_ML = "commercial_ml"


class PermissionStatus(str, Enum):
    """Rights clearance status."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class TaxonType(str, Enum):
    """Type of organism in taxonomy."""
    HOST = "host"
    PATHOGEN = "pathogen"
    OTHER = "other"


class ConditionType(str, Enum):
    """Type of physiological condition."""
    DISEASE = "disease"
    DISORDER = "disorder"
    PEST = "pest"
    HEALTHY = "healthy"


class AnnotationState(str, Enum):
    """Health/disease state of an observation asset."""
    DISEASE = "disease"
    HEALTHY = "healthy"
    UNCERTAIN = "uncertain"


class EvidenceLevel(str, Enum):
    """Diagnostic evidence grounding level."""
    SOURCE_LABEL = "source_label"
    EXPERT_VISUAL = "expert_visual"
    LABORATORY_SUPPORTED = "laboratory_supported"


class PermissionDecision(BaseModel):
    """Permission and licensing decision for an asset or batch."""
    model_config = ConfigDict(frozen=True)

    rights_id: UUID
    reviewer_id: str
    reviewed_at: datetime
    evidence_ref: str
    can_store: bool | None = None
    can_display: bool | None = None
    can_transform: bool | None = None
    can_train: bool | None = None
    can_redistribute: bool | None = None
    attribution: str
    expires_at: datetime | None = None
    status: PermissionStatus = PermissionStatus.PENDING


class SourceRecord(BaseModel):
    """Record of an acquired image from an upstream source."""
    model_config = ConfigDict(frozen=True)

    source_id: UUID
    source_version: str
    external_id: str
    rights_id: UUID
    original_label: str
    source_url: str | None = None
    local_path: str | None = None
    observation_id: UUID | None = None


class AssetRecord(BaseModel):
    """Master record of a stored original asset."""
    model_config = ConfigDict(frozen=True)

    asset_id: UUID
    original_sha256: str
    pixel_sha256: str
    storage_key: str
    width: int
    height: int
    mime: str
    observation_id: UUID | None = None
    duplicate_group_id: UUID | None = None
    status: str = "active"


class IngestReport(BaseModel):
    """Summary of batch ingestion."""
    new_assets: int = 0
    reused_assets: int = 0
    pending: int = 0
    rejected: int = 0
    error_records: list[dict[str, Any]] = Field(default_factory=list)


class QualityReport(BaseModel):
    """Automated technical quality assessment."""
    decodable: bool
    width: int
    height: int
    flags: list[str] = Field(default_factory=list)


class DuplicateCandidate(BaseModel):
    """Potential perceptual duplicate candidate."""
    left_asset_id: UUID
    right_asset_id: UUID
    distance: int
    method: str = "phash64"


class LabelMapping(BaseModel):
    """Mapping of a source label to internal taxonomy."""
    source_id: UUID
    source_label: str
    host_taxon_id: UUID
    condition_id: UUID | None = None
    state: AnnotationState
    mapping_status: str = "approved"


class ReviewDecision(BaseModel):
    """Expert annotation decision."""
    asset_id: UUID
    expected_annotation_version: int
    reviewer_id: str
    state: AnnotationState
    condition_ids: list[UUID] = Field(default_factory=list)
    host_taxon_id: UUID
    organ: str
    evidence_level: EvidenceLevel
    decision: str
    notes: str | None = None


class ReleasePolicy(BaseModel):
    """Rules and parameters for dataset release."""
    purpose: Purpose
    seed: int = 42
    fractions: tuple[float, float, float] = (0.70, 0.15, 0.15)
    approved_only: bool = True
    single_label_only: bool = True
    require_second_review_for_test: bool = True


class ReleaseManifest(BaseModel):
    """Cryptographic manifest of a published release."""
    release_id: UUID
    version: str
    purpose: Purpose
    snapshot_id: UUID
    taxonomy_version: str
    policy_version: str
    item_count: int
    manifest_sha256: str


class AuditReport(BaseModel):
    """Audit verification report."""
    failures: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    counts: dict[str, int] = Field(default_factory=dict)
