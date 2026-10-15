"""SQLAlchemy models for simplified 4-table PlantDB schema."""

from datetime import datetime, timezone
import uuid
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    event,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# Enable foreign key constraint checking for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection: Any, connection_record: Any) -> None:
    if hasattr(dbapi_connection, "cursor"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass
        finally:
            cursor.close()


class Base(DeclarativeBase):
    pass


class DiseaseClass(Base):
    """Table 1: Catalog of crop disease and healthy states."""
    __tablename__ = "classes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g., 'tomato_early_blight'
    crop: Mapped[str] = mapped_column(String(64), index=True)  # 'Томат'
    crop_en: Mapped[str] = mapped_column(String(64), index=True)  # 'Tomato'
    disease_name: Mapped[str] = mapped_column(String(128), index=True)  # 'Альтернариоз'
    disease_name_en: Mapped[str] = mapped_column(String(128))  # 'Early Blight'
    is_healthy: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    treatment_recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    images: Mapped[List["ImageRecord"]] = relationship(back_populates="disease_class")


class Source(Base):
    """Table 2: Open datasets and legal licenses."""
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # 'plantvillage', 'mendeley'
    name: Mapped[str] = mapped_column(String(255))
    url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    license_type: Mapped[str] = mapped_column(String(64))  # 'CC BY-SA 3.0', 'CC BY 4.0'
    attribution: Mapped[str] = mapped_column(Text)
    can_display: Mapped[bool] = mapped_column(Boolean, default=True)
    can_use_for_eval: Mapped[bool] = mapped_column(Boolean, default=True)

    images: Mapped[List["ImageRecord"]] = relationship(back_populates="source")


class ImageRecord(Base):
    """Table 3: Photo metadata with deduplication and verification."""
    __tablename__ = "images"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_path: Mapped[str] = mapped_column(String(512), unique=True)
    sha256: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    phash: Mapped[Optional[str]] = mapped_column(String(32), index=True, nullable=True)
    class_id: Mapped[str] = mapped_column(String(64), ForeignKey("classes.id", ondelete="RESTRICT"), index=True)
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("sources.id", ondelete="RESTRICT"), index=True)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    mime_type: Mapped[str] = mapped_column(String(32))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    disease_class: Mapped["DiseaseClass"] = relationship(back_populates="images")
    source: Mapped["Source"] = relationship(back_populates="images")
    evaluations: Mapped[List["ModelEvaluation"]] = relationship(back_populates="image", cascade="all, delete-orphan")


class ModelEvaluation(Base):
    """Table 4: Benchmark evaluation results for pre-trained candidate models."""
    __tablename__ = "model_evaluations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name: Mapped[str] = mapped_column(String(128), index=True)  # e.g., 'MobileNetV3_PlantVillage'
    image_id: Mapped[str] = mapped_column(String(64), ForeignKey("images.id", ondelete="CASCADE"), index=True)
    predicted_class_id: Mapped[str] = mapped_column(String(64), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    is_correct: Mapped[bool] = mapped_column(Boolean, index=True)
    inference_time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    image: Mapped["ImageRecord"] = relationship(back_populates="evaluations")
