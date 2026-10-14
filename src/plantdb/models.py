"""SQLAlchemy declarative models for PlantDB catalog and provenance."""

from datetime import datetime, timezone
import uuid
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    event,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# Enable foreign key constraint checking for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection: Any, connection_record: Any) -> None:
    if hasattr(dbapi_connection, "execute"):
        # Check if driver is sqlite3
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass
        finally:
            cursor.close()


class Base(DeclarativeBase):
    pass


class Taxon(Base):
    """Taxonomic entity (host plant, pathogen, or other organism)."""
    __tablename__ = "taxa"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    taxon_type: Mapped[str] = mapped_column(String(32), index=True)  # host, pathogen, other
    canonical_name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    common_name_ru: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    common_name_en: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    eppo_code: Mapped[Optional[str]] = mapped_column(String(32), index=True, nullable=True)
    external_ids: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    aliases: Mapped[List["TaxonAlias"]] = relationship(back_populates="taxon", cascade="all, delete-orphan")
    host_conditions: Mapped[List["ConditionHost"]] = relationship(back_populates="host_taxon")
    pathogen_conditions: Mapped[List["ConditionPathogen"]] = relationship(back_populates="pathogen_taxon")
    observations: Mapped[List["Observation"]] = relationship(back_populates="host_taxon")


class TaxonAlias(Base):
    """Synonyms and alternative names for taxa."""
    __tablename__ = "taxon_aliases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    taxon_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("taxa.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    language: Mapped[str] = mapped_column(String(16))  # ru, en, la
    source: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(64), default="synonym")

    taxon: Mapped["Taxon"] = relationship(back_populates="aliases")


class Condition(Base):
    """Disease, physiological disorder, pest damage, or healthy state."""
    __tablename__ = "conditions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    condition_type: Mapped[str] = mapped_column(String(32), index=True)  # disease, disorder, pest, healthy
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    pathogens: Mapped[List["ConditionPathogen"]] = relationship(back_populates="condition", cascade="all, delete-orphan")
    hosts: Mapped[List["ConditionHost"]] = relationship(back_populates="condition", cascade="all, delete-orphan")
    texts: Mapped[List["ConditionText"]] = relationship(back_populates="condition", cascade="all, delete-orphan")
    annotations: Mapped[List["Annotation"]] = relationship(back_populates="condition")


class ConditionPathogen(Base):
    """Association between condition and pathogen taxa (supports multiple pathogens or unknown)."""
    __tablename__ = "condition_pathogens"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    condition_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("conditions.id", ondelete="CASCADE"), index=True)
    pathogen_taxon_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("taxa.id", ondelete="CASCADE"), index=True)

    condition: Mapped["Condition"] = relationship(back_populates="pathogens")
    pathogen_taxon: Mapped["Taxon"] = relationship(back_populates="pathogen_conditions")

    __table_args__ = (
        UniqueConstraint("condition_id", "pathogen_taxon_id", name="uq_condition_pathogen"),
    )


class ConditionHost(Base):
    """Host plant species subject to this condition."""
    __tablename__ = "condition_hosts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    condition_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("conditions.id", ondelete="CASCADE"), index=True)
    host_taxon_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("taxa.id", ondelete="CASCADE"), index=True)
    confirmation_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    condition: Mapped["Condition"] = relationship(back_populates="hosts")
    host_taxon: Mapped["Taxon"] = relationship(back_populates="host_conditions")

    __table_args__ = (
        UniqueConstraint("condition_id", "host_taxon_id", name="uq_condition_host"),
    )


class ConditionText(Base):
    """Descriptive texts and symptoms for conditions."""
    __tablename__ = "condition_texts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    condition_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("conditions.id", ondelete="CASCADE"), index=True)
    language: Mapped[str] = mapped_column(String(16))
    symptoms_text: Mapped[str] = mapped_column(Text)
    author: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rights_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("rights.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="verified")
    version: Mapped[int] = mapped_column(Integer, default=1)

    condition: Mapped["Condition"] = relationship(back_populates="texts")


class Source(Base):
    """Data source or acquisition channel."""
    __tablename__ = "sources"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    version: Mapped[str] = mapped_column(String(64))
    url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    access_method: Mapped[str] = mapped_column(String(64))
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    asset_sources: Mapped[List["AssetSource"]] = relationship(back_populates="source")


class Right(Base):
    """Legal rights, license agreements, and permitted use decisions."""
    __tablename__ = "rights"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    rights_holder: Mapped[str] = mapped_column(String(255))
    license: Mapped[str] = mapped_column(String(255))
    evidence: Mapped[str] = mapped_column(String(512))
    can_store: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    can_display: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    can_transform: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    can_train: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    can_redistribute: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    attribution: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewer: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)

    asset_sources: Mapped[List["AssetSource"]] = relationship(back_populates="right")
    dataset_items: Mapped[List["DatasetItem"]] = relationship(back_populates="right")


class Observation(Base):
    """Field observation event (grouping related shots of the same plant/session)."""
    __tablename__ = "observations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    anonymized_code: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    observed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    host_taxon_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("taxa.id", ondelete="RESTRICT"), index=True)

    host_taxon: Mapped["Taxon"] = relationship(back_populates="observations")
    assets: Mapped[List["Asset"]] = relationship(back_populates="observation")


class Asset(Base):
    """Original stored image asset."""
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    original_sha256: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    pixel_sha256: Mapped[str] = mapped_column(String(64), index=True)
    phash64: Mapped[Optional[str]] = mapped_column(String(32), index=True, nullable=True)
    storage_key: Mapped[str] = mapped_column(String(512), unique=True)
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    mime: Mapped[str] = mapped_column(String(64))
    duplicate_group_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, index=True, nullable=True)
    observation_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("observations.id", ondelete="SET NULL"), index=True, nullable=True)
    technical_status: Mapped[str] = mapped_column(String(32), default="active", index=True)

    observation: Mapped[Optional["Observation"]] = relationship(back_populates="assets")
    sources: Mapped[List["AssetSource"]] = relationship(back_populates="asset", cascade="all, delete-orphan")
    annotations: Mapped[List["Annotation"]] = relationship(back_populates="asset", cascade="all, delete-orphan")
    variants: Mapped[List["AssetVariant"]] = relationship(back_populates="asset", cascade="all, delete-orphan")
    dataset_items: Mapped[List["DatasetItem"]] = relationship(back_populates="asset")


class AssetSource(Base):
    """Provenance tracking: links an asset to a source and associated rights."""
    __tablename__ = "asset_sources"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("assets.id", ondelete="CASCADE"), index=True)
    source_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("sources.id", ondelete="RESTRICT"), index=True)
    rights_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("rights.id", ondelete="RESTRICT"), index=True)
    external_id: Mapped[str] = mapped_column(String(255), index=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    original_label: Mapped[str] = mapped_column(String(255))

    asset: Mapped["Asset"] = relationship(back_populates="sources")
    source: Mapped["Source"] = relationship(back_populates="asset_sources")
    right: Mapped["Right"] = relationship(back_populates="asset_sources")

    __table_args__ = (
        UniqueConstraint("asset_id", "source_id", "external_id", name="uq_asset_source_external"),
    )


class Annotation(Base):
    """Diagnostic annotation record."""
    __tablename__ = "annotations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("assets.id", ondelete="CASCADE"), index=True)
    condition_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("conditions.id", ondelete="SET NULL"), index=True, nullable=True)
    host_taxon_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("taxa.id", ondelete="SET NULL"), index=True, nullable=True)
    state: Mapped[str] = mapped_column(String(32), index=True)  # disease, healthy, uncertain
    organ: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    symptoms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    confirmation_method: Mapped[str] = mapped_column(String(64))  # source_label, expert_visual, laboratory_supported
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)  # pending, approved, disputed

    asset: Mapped["Asset"] = relationship(back_populates="annotations")
    condition: Mapped[Optional["Condition"]] = relationship(back_populates="annotations")
    reviews: Mapped[List["Review"]] = relationship(back_populates="annotation", cascade="all, delete-orphan")


class Review(Base):
    """Expert review and verification decision."""
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    annotation_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("annotations.id", ondelete="CASCADE"), index=True)
    reviewer: Mapped[str] = mapped_column(String(255))
    decision: Mapped[str] = mapped_column(String(32))  # approve, reject, dispute, uncertain
    reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    annotation: Mapped["Annotation"] = relationship(back_populates="reviews")


class AssetVariant(Base):
    """Processed or normalized variant of an asset."""
    __tablename__ = "asset_variants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("assets.id", ondelete="CASCADE"), index=True)
    variant_key: Mapped[str] = mapped_column(String(512), unique=True)
    transforms: Mapped[dict] = mapped_column(JSON)
    processing_version: Mapped[str] = mapped_column(String(32))
    sha256: Mapped[str] = mapped_column(String(64), index=True)

    asset: Mapped["Asset"] = relationship(back_populates="variants")


class DatasetRelease(Base):
    """Immutable release snapshot record."""
    __tablename__ = "dataset_releases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    version: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    purpose: Mapped[str] = mapped_column(String(32), index=True)  # gallery, commercial_ml
    criteria: Mapped[dict] = mapped_column(JSON)
    cutoff_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    schema_version: Mapped[str] = mapped_column(String(32))
    manifest_sha256: Mapped[str] = mapped_column(String(64))

    items: Mapped[List["DatasetItem"]] = relationship(back_populates="release", cascade="all, delete-orphan")


class DatasetItem(Base):
    """Item included in a dataset release."""
    __tablename__ = "dataset_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    release_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("dataset_releases.id", ondelete="CASCADE"), index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("assets.id", ondelete="RESTRICT"), index=True)
    annotation_version: Mapped[int] = mapped_column(Integer)
    rights_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("rights.id", ondelete="RESTRICT"), index=True)
    split: Mapped[str] = mapped_column(String(32), index=True)  # train, validation, test, gallery
    class_id: Mapped[str] = mapped_column(String(128), index=True)

    release: Mapped["DatasetRelease"] = relationship(back_populates="items")
    asset: Mapped["Asset"] = relationship(back_populates="dataset_items")
    right: Mapped["Right"] = relationship(back_populates="dataset_items")

    __table_args__ = (
        UniqueConstraint("release_id", "asset_id", name="uq_release_asset"),
    )


class AuditEvent(Base):
    """Audit log entry for tracing operations and changes."""
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    actor: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(128), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    old_state: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_state: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
