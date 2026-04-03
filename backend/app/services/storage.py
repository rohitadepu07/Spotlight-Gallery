import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from fastapi import UploadFile

from app.core.config import Settings


@dataclass
class StoredPhoto:
    storage_key: str
    url: str
    thumbnail_url: str | None = None


class StorageService(Protocol):
    def upload_event_photo(self, event_id: str, file: UploadFile, content: bytes) -> StoredPhoto:
        ...


class LocalStorageService:
    def __init__(self, settings: Settings) -> None:
        self.base_dir = Path(settings.local_storage_path).resolve()
        self.public_base_url = settings.public_base_url.rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def upload_event_photo(self, event_id: str, file: UploadFile, content: bytes) -> StoredPhoto:
        extension = Path(file.filename or "image.jpg").suffix or ".jpg"
        filename = f"{uuid.uuid4().hex}{extension.lower()}"
        relative_key = Path(event_id) / filename
        absolute_path = self.base_dir / relative_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content)
        public_key = relative_key.as_posix()
        url = f"{self.public_base_url}/{public_key}"
        return StoredPhoto(storage_key=public_key, url=url, thumbnail_url=url)


class S3StorageService:
    def __init__(self, settings: Settings) -> None:
        try:
            import boto3
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("boto3 is required for S3 storage.") from exc

        if not settings.s3_bucket_name:
            raise RuntimeError("S3_BUCKET_NAME is required when STORAGE_BACKEND=s3.")

        self.bucket = settings.s3_bucket_name
        self.public_base_url = (settings.s3_public_base_url or "").rstrip("/")
        self.client = boto3.client("s3", region_name=settings.s3_region)

    def upload_event_photo(self, event_id: str, file: UploadFile, content: bytes) -> StoredPhoto:
        extension = Path(file.filename or "image.jpg").suffix or ".jpg"
        key = f"{event_id}/{uuid.uuid4().hex}{extension.lower()}"
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type or "image/jpeg",
        )
        if self.public_base_url:
            url = f"{self.public_base_url}/{key}"
        else:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=3600,
            )
        return StoredPhoto(storage_key=key, url=url, thumbnail_url=url)


class CloudinaryStorageService:
    def __init__(self, settings: Settings) -> None:
        try:
            import cloudinary
            import cloudinary.uploader
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("cloudinary is required for Cloudinary storage.") from exc

        if not all(
            [settings.cloudinary_cloud_name, settings.cloudinary_api_key, settings.cloudinary_api_secret]
        ):
            raise RuntimeError(
                "Cloudinary credentials are required when STORAGE_BACKEND=cloudinary."
            )

        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )
        self.folder = settings.cloudinary_folder
        self.uploader = cloudinary.uploader

    def upload_event_photo(self, event_id: str, file: UploadFile, content: bytes) -> StoredPhoto:
        folder = f"{self.folder}/{event_id}"
        result = self.uploader.upload(
            content,
            folder=folder,
            resource_type="image",
            public_id=uuid.uuid4().hex,
            overwrite=False,
        )
        url = result["secure_url"]
        return StoredPhoto(storage_key=result["public_id"], url=url, thumbnail_url=url)


def get_storage_service(settings: Settings) -> StorageService:
    backend = settings.storage_backend.lower()
    if backend == "local":
        return LocalStorageService(settings)
    if backend == "s3":
        return S3StorageService(settings)
    if backend == "cloudinary":
        return CloudinaryStorageService(settings)
    raise ValueError(f"Unsupported storage backend: {backend}")
