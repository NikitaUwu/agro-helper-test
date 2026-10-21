"""Automated downloader for open dataset images (PlantVillage, Mendeley, etc.)."""

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import sys
import time
from typing import Dict, List, Optional
import urllib.request

from plantdb.ingest import ingest_directory
from plantdb.registry import model_labels

PLANTVILLAGE_REPO = "spMohanty/PlantVillage-Dataset"
PLANTVILLAGE_RAW_BASE = "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color"

# Target classes supported in PlantVillage repository
DEFAULT_TARGET_CLASSES = [
    # Томат (Tomato)
    "Tomato___healthy",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    # Картофель (Potato)
    "Potato___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    # Яблоня (Apple)
    "Apple___healthy",
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
]


DEFAULT_TARGET_CLASSES = [item['rawLabel'] for item in model_labels() if item['enabled']]


def fetch_folder_file_list(folder_name: str) -> List[Dict[str, str]]:
    """Fetch list of files in a PlantVillage folder via GitHub API."""
    url = f"https://api.github.com/repos/{PLANTVILLAGE_REPO}/contents/raw/color/{folder_name}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (PlantDB-Downloader/1.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            items = json.loads(res.read().decode("utf-8"))
            return [
                {
                    "name": item["name"],
                    "download_url": item.get("download_url") or f"{PLANTVILLAGE_RAW_BASE}/{folder_name}/{item['name']}",
                }
                for item in items
                if item.get("type") == "file"
            ]
    except Exception as e:
        print(f"[Warning] Failed to fetch listing for {folder_name}: {e}")
        return []


def download_single_file(download_url: str, dest_path: Path, max_retries: int = 3) -> bool:
    """Download a single image file with retries."""
    if dest_path.exists() and dest_path.stat().st_size > 0:
        return True  # Already downloaded

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(
        download_url,
        headers={"User-Agent": "Mozilla/5.0 (PlantDB-Downloader/1.0)"},
    )

    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                content = response.read()
                dest_path.write_bytes(content)
                return True
        except Exception as e:
            if attempt == max_retries:
                print(f"[Error] Failed to download {dest_path.name}: {e}")
                return False
            time.sleep(0.5 * attempt)
    return False


def download_plantvillage(
    target_dir: Path | str = "./data/downloads/plantvillage",
    folders: Optional[List[str]] = None,
    limit_per_class: int = 20,
    max_workers: int = 8,
) -> Dict[str, int]:
    """Download specified number of images per class from PlantVillage.

    Returns dict mapping folder_name to number of downloaded images.
    """
    base_dir = Path(target_dir)
    selected_folders = folders or DEFAULT_TARGET_CLASSES
    results: Dict[str, int] = {}

    print(f"\n=== Downloading PlantVillage Images ===")
    print(f"Target directory: {base_dir.resolve()}")
    print(f"Classes to fetch: {len(selected_folders)}")
    print(f"Limit per class:  {limit_per_class} images\n")

    for idx, folder in enumerate(selected_folders, 1):
        print(f"[{idx}/{len(selected_folders)}] Fetching list for '{folder}'...", end=" ", flush=True)
        file_list = fetch_folder_file_list(folder)
        if not file_list:
            print("0 files found.")
            results[folder] = 0
            continue

        files_to_download = file_list[:limit_per_class]
        print(f"found {len(file_list)} files. Downloading {len(files_to_download)}...")

        folder_dir = base_dir / folder
        downloaded_count = 0

        # Download images concurrently for speed
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_file = {
                executor.submit(
                    download_single_file,
                    f["download_url"],
                    folder_dir / f["name"],
                ): f["name"]
                for f in files_to_download
            }

            for future in as_completed(future_to_file):
                if future.result():
                    downloaded_count += 1

        results[folder] = downloaded_count
        print(f"   -> Saved {downloaded_count} images to {folder_dir.name}/")

    total_downloaded = sum(results.values())
    print(f"\n[Finished] Total images downloaded: {total_downloaded}")
    return results
