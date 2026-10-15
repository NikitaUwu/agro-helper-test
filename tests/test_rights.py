"""Tests for open dataset rights and licensing verification."""

import pytest

from plantdb.contracts import SourceRecord
from plantdb.rights import can_display_image, can_evaluate_model, format_attribution


@pytest.fixture
def plantvillage_source():
    return SourceRecord(
        id="plantvillage",
        name="PlantVillage Dataset",
        url="https://huggingface.co/datasets/mohanty/PlantVillage",
        license_type="CC BY-SA 3.0",
        attribution="David P. Hughes, Marcel Salathé (Penn State University)",
        can_display=True,
        can_use_for_eval=True,
    )


@pytest.fixture
def restricted_source():
    return SourceRecord(
        id="plantwild_restricted",
        name="PlantWild NonCommercial",
        license_type="CC BY-NC-ND 4.0",
        attribution="PlantWild Research Team",
        can_display=False,
        can_use_for_eval=False,
    )


def test_open_source_permissions(plantvillage_source):
    assert can_display_image(plantvillage_source) is True
    assert can_evaluate_model(plantvillage_source) is True
    attribution = format_attribution(plantvillage_source)
    assert "PlantVillage Dataset" in attribution
    assert "CC BY-SA 3.0" in attribution
    assert "Hughes" in attribution


def test_restricted_source_permissions(restricted_source):
    assert can_display_image(restricted_source) is False
    assert can_evaluate_model(restricted_source) is False
