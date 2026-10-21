"""Shared model/crop catalogue used by the browser, importer and downloader."""
import json
from pathlib import Path
import sys

CONFIG_DIRECTORY = next((directory for directory in (
    Path(__file__).resolve().parents[2] / 'config',
    Path(sys.prefix) / 'share' / 'plantdb',
) if (directory / 'model_labels.json').is_file()), Path(__file__).resolve().parents[2] / 'config')


def model_labels() -> list[dict]:
    return json.loads((CONFIG_DIRECTORY / 'model_labels.json').read_text(encoding='utf-8'))['labels']


def additional_conditions() -> list[dict]:
    return json.loads((CONFIG_DIRECTORY / 'model_conditions.json').read_text(encoding='utf-8'))
