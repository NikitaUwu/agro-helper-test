"""Rights and license verification module for open datasets."""

from plantdb.contracts import SourceRecord


def can_display_image(source: SourceRecord) -> bool:
    """Check if the source license permits displaying the image in user interfaces."""
    return bool(source.can_display)


def can_evaluate_model(source: SourceRecord) -> bool:
    """Check if the source permits using the image for testing/benchmarking models."""
    return bool(source.can_use_for_eval)


def format_attribution(source: SourceRecord) -> str:
    """Return mandatory attribution string for display in UI."""
    return f"Источник: {source.name} ({source.license_type}). {source.attribution}"
