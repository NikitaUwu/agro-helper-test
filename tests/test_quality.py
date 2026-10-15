"""Tests for image quality inspection and perceptual hashing."""

from pathlib import Path
from PIL import Image
import pytest

from plantdb.quality import inspect_image


@pytest.fixture
def temp_images_dir(tmp_path: Path):
    """Create directory with test images of varying quality."""
    images_dir = tmp_path / "test_imgs"
    images_dir.mkdir()

    # 1. Valid image (300x300, JPEG)
    valid_path = images_dir / "valid_leaf.jpg"
    img = Image.new("RGB", (300, 300), color=(34, 139, 34))
    img.save(valid_path, format="JPEG")

    # 2. Too small image (100x100, JPEG)
    small_path = images_dir / "small_leaf.jpg"
    img_small = Image.new("RGB", (100, 100), color=(34, 139, 34))
    img_small.save(small_path, format="JPEG")

    # 3. Corrupt image file
    corrupt_path = images_dir / "corrupt.jpg"
    corrupt_path.write_bytes(b"not an image file content definitely")

    return {
        "valid": valid_path,
        "small": small_path,
        "corrupt": corrupt_path,
    }


def test_inspect_valid_image(temp_images_dir):
    result = inspect_image(temp_images_dir["valid"], min_dimension=224)
    assert result.is_valid is True
    assert result.width == 300
    assert result.height == 300
    assert result.mime_type == "image/jpeg"
    assert len(result.sha256) == 64
    assert result.phash is not None


def test_inspect_small_image_rejected(temp_images_dir):
    result = inspect_image(temp_images_dir["small"], min_dimension=224)
    assert result.is_valid is False
    assert "below minimum" in (result.error or "")


def test_inspect_corrupt_image_rejected(temp_images_dir):
    result = inspect_image(temp_images_dir["corrupt"])
    assert result.is_valid is False
    assert "Corrupt or unreadable" in (result.error or "")


def test_inspect_nonexistent_file(tmp_path):
    result = inspect_image(tmp_path / "does_not_exist.jpg")
    assert result.is_valid is False
    assert "File not found" in (result.error or "")
