"""Command-line interface for PlantDB management and ingestion."""

import argparse
from pathlib import Path
import sys

from plantdb.db import init_db
from plantdb.ingest import ingest_directory
from plantdb.models import DiseaseClass, ImageRecord, ModelEvaluation, Source


def cmd_init(args):
    """Initialize database and seed 25 classes and open sources."""
    print("Initializing PlantDB database and seeding catalog...")
    session_factory = init_db()
    with session_factory() as session:
        class_count = session.query(DiseaseClass).count()
        source_count = session.query(Source).count()
        print(f"Database ready: {class_count} classes, {source_count} sources configured.")


def cmd_import(args):
    """Import images from a directory."""
    dir_path = Path(args.path)
    if not dir_path.exists():
        print(f"Error: Path {dir_path} does not exist.")
        sys.exit(1)

    session_factory = init_db()
    with session_factory() as session:
        print(f"Starting import from {dir_path} (source: {args.source})...")
        summary = ingest_directory(
            session=session,
            dir_path=dir_path,
            source_id=args.source,
            default_class_id=args.class_id,
            min_dimension=args.min_dim,
        )
        print("\n--- Ingest Summary ---")
        print(f"Total files found:      {summary.total_found}")
        print(f"Successfully imported:  {summary.imported}")
        print(f"Duplicates skipped:     {summary.duplicates_skipped}")
        print(f"Quality rejected:       {summary.quality_rejected}")
        if summary.errors:
            print(f"Errors encountered:     {len(summary.errors)}")
            for err in summary.errors[:5]:
                print(f"  - {err}")


def cmd_stats(args):
    """Show current database statistics."""
    session_factory = init_db()
    with session_factory() as session:
        classes = session.query(DiseaseClass).all()
        images_count = session.query(ImageRecord).count()
        evals_count = session.query(ModelEvaluation).count()

        print("=== PlantDB Statistics ===")
        print(f"Total catalog classes: {len(classes)}")
        print(f"Total stored images:   {images_count}")
        print(f"Model evaluations:     {evals_count}")
        print("\nBreakdown by crop:")
        crops = sorted(list({c.crop for c in classes}))
        for crop in crops:
            crop_classes = [c for c in classes if c.crop == crop]
            class_ids = [c.id for c in crop_classes]
            img_count = session.query(ImageRecord).filter(ImageRecord.class_id.in_(class_ids)).count()
            print(f"  - {crop}: {len(crop_classes)} classes, {img_count} images")


def main():
    parser = argparse.ArgumentParser(description="PlantDB CLI Management Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # init
    subparsers.add_parser("init", help="Initialize tables and seed catalog")

    # import-dir
    parser_import = subparsers.add_parser("import-dir", help="Ingest a directory of images")
    parser_import.add_argument("--path", required=True, help="Directory path to import")
    parser_import.add_argument("--source", default="plantvillage", help="Source ID (default: plantvillage)")
    parser_import.add_argument("--class-id", default=None, help="Force specific class_id for all images")
    parser_import.add_argument("--min-dim", type=int, default=224, help="Minimum image dimension (default: 224)")

    # stats
    subparsers.add_parser("stats", help="Display database statistics")

    args = parser.parse_args()
    if args.command == "init":
        cmd_init(args)
    elif args.command == "import-dir":
        cmd_import(args)
    elif args.command == "stats":
        cmd_stats(args)


if __name__ == "__main__":
    main()
