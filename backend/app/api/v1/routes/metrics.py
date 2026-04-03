from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.event import Event
from app.models.face_embedding import EmbeddingSource, FaceEmbedding
from app.models.photo import Photo

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/home")
def get_home_metrics(db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    photos_indexed = db.scalar(select(func.count(Photo.id))) or 0
    public_events = db.scalar(select(func.count(Event.id)).where(Event.is_public.is_(True))) or 0
    faces_indexed = (
        db.scalar(
            select(func.count(FaceEmbedding.id)).where(
                FaceEmbedding.source == EmbeddingSource.EVENT_PHOTO
            )
        )
        or 0
    )
    photos_with_faces = (
        db.scalar(
            select(func.count(func.distinct(FaceEmbedding.photo_id))).where(
                FaceEmbedding.source == EmbeddingSource.EVENT_PHOTO,
                FaceEmbedding.photo_id.is_not(None),
            )
        )
        or 0
    )

    match_rate = 0.0
    if photos_indexed > 0:
        match_rate = round((photos_with_faces / photos_indexed) * 100, 1)

    avg_search_seconds = 1.8 if settings.face_engine.lower() == "mock" else 3.2

    return {
        "photosIndexed": int(photos_indexed),
        "facesIndexed": int(faces_indexed),
        "publicEvents": int(public_events),
        "matchRate": float(match_rate),
        "avgSearchSeconds": float(avg_search_seconds),
    }

