import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.event import Event
from app.models.face_embedding import EmbeddingSource, FaceEmbedding
from app.models.photo import Photo
from app.schemas.photo import MatchResponse
from app.services.dependencies import get_face_engine_service
from app.services.face_engine import FaceEngine
from app.services.matching import rank_photo_matches
from app.services.serializers import photo_to_response

router = APIRouter(prefix="/matching", tags=["matching"])


@router.post("/event/{event_id}/selfie", response_model=MatchResponse)
async def match_selfie(
    event_id: uuid.UUID,
    selfie: UploadFile = File(...),
    db: Session = Depends(get_db),
    face_engine: FaceEngine = Depends(get_face_engine_service),
) -> dict:
    settings = get_settings()
    event = db.scalar(select(Event).where(Event.id == event_id))
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    selfie_bytes = await selfie.read()
    if not selfie_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selfie file is empty")

    selfie_faces = face_engine.extract_faces(selfie_bytes)
    if not selfie_faces:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No face detected in selfie image.",
        )

    selfie_face = selfie_faces[0]
    all_embeddings = db.scalars(
        select(FaceEmbedding).where(
            FaceEmbedding.event_id == event_id,
            FaceEmbedding.source == EmbeddingSource.EVENT_PHOTO,
        )
    ).all()

    ranked = rank_photo_matches(
        selfie_face.embedding,
        [(row.photo_id, row.embedding) for row in all_embeddings],
        threshold=settings.match_threshold,
    )

    if not ranked:
        return {
            "eventId": str(event_id),
            "matchesFound": 0,
            "threshold": settings.match_threshold,
            "photos": [],
            "scannedAt": datetime.now(timezone.utc),
        }

    photo_lookup = {
        str(photo.id): photo
        for photo in db.scalars(
            select(Photo).where(Photo.id.in_([photo_id for photo_id, _ in ranked]))
        ).all()
    }

    photos_payload: list[dict] = []
    for photo_id, score in ranked:
        photo = photo_lookup.get(str(photo_id))
        if not photo:
            continue
        photos_payload.append(photo_to_response(photo, event_name=event.name, match_confidence=score))

    return {
        "eventId": str(event_id),
        "matchesFound": len(photos_payload),
        "threshold": settings.match_threshold,
        "photos": photos_payload,
        "scannedAt": datetime.now(timezone.utc),
    }

