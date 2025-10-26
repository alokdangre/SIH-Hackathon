from pathlib import Path
from typing import Iterable

from fastapi import UploadFile

from app.core.config import get_settings

settings = get_settings()


def ensure_media_root() -> Path:
    root = Path(settings.media_root)
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_upload_files(files: Iterable[UploadFile], subdir: str) -> list[str]:
    saved_paths: list[str] = []
    media_root = ensure_media_root()
    target_dir = media_root / subdir
    target_dir.mkdir(parents=True, exist_ok=True)

    for index, file in enumerate(files, start=1):
        if not file.filename:
            continue
        safe_name = f"{index}_{file.filename.replace(' ', '_')}"
        destination = target_dir / safe_name
        with destination.open("wb") as buffer:
            buffer.write(file.file.read())
        # build public path relative to mount, e.g. /media/subdir/... to serve statically
        relative_path = destination.relative_to(media_root)
        saved_paths.append(f"/media/{relative_path.as_posix()}")
    return saved_paths
