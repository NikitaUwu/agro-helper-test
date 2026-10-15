"""Image quality inspection, hashing, and validation."""

import hashlib
from pathlib import Path
from typing import Optional

from PIL import Image
import imagehash

from plantdb.contracts import QualityCheckResult

MIN_DIMENSION = 224
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def inspect_image(file_path: Path | str, min_dimension: int = MIN_DIMENSION) -> QualityCheckResult:
    """Inspect image file: decodability, dimensions, format, SHA256 and pHash."""
    path = Path(file_path)
    if not path.exists():
        return QualityCheckResult(is_valid=False, error=f"File not found: {path}")

    # 1. Compute SHA-256
    try:
        hasher = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        sha256 = hasher.hexdigest()
    except Exception as e:
        return QualityCheckResult(is_valid=False, error=f"Failed to read file: {e}")

    # 2. Inspect with Pillow
    try:
        with Image.open(path) as img:
            img.verify()  # Verify integrity
            img_format = img.format
            width, height = img.size

        # Re-open for perceptual hashing (verify closes or invalidates image in PIL)
        with Image.open(path) as img:
            phash_str = str(imagehash.phash(img))

        if img_format not in ALLOWED_FORMATS:
            return QualityCheckResult(
                is_valid=False,
                width=width,
                height=height,
                mime_type=f"image/{img_format.lower() if img_format else 'unknown'}",
                sha256=sha256,
                error=f"Unsupported format {img_format}. Allowed: {ALLOWED_FORMATS}",
            )

        if width < min_dimension or height < min_dimension:
            return QualityCheckResult(
                is_valid=False,
                width=width,
                height=height,
                mime_type=f"image/{img_format.lower()}",
                sha256=sha256,
                phash=phash_str,
                error=f"Image resolution {width}x{height} below minimum {min_dimension}px",
            )

        return QualityCheckResult(
            is_valid=True,
            width=width,
            height=height,
            mime_type=f"image/{img_format.lower()}",
            sha256=sha256,
            phash=phash_str,
        )

    except Exception as e:
        return QualityCheckResult(
            is_valid=False,
            sha256=sha256,
            error=f"Corrupt or unreadable image: {e}",
        )
