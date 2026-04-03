from functools import lru_cache

from app.core.config import get_settings
from app.services.face_engine import FaceEngine, get_face_engine
from app.services.storage import StorageService, get_storage_service


@lru_cache
def get_face_engine_service() -> FaceEngine:
    return get_face_engine(get_settings())


@lru_cache
def get_storage_service_client() -> StorageService:
    return get_storage_service(get_settings())

