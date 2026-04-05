import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.event import Event
from app.models.face_embedding import EmbeddingSource, FaceEmbedding
from app.models.photo import Photo
from app.schemas.photo import PhotoLinksResponse, PhotoResponse, PhotoUploadSummary
from app.services.dependencies import get_face_engine_service, get_storage_service_client
from app.services.face_engine import FaceEngine
from app.services.serializers import photo_to_response
from app.services.storage import StorageService

router = APIRouter(prefix="/photos", tags=["photos"])
logger = logging.getLogger(__name__)


@router.get("/event/{event_id}", response_model=list[PhotoResponse])
def list_event_photos(event_id: uuid.UUID, db: Session = Depends(get_db)) -> list[dict]:
    event = db.scalar(select(Event).where(Event.id == event_id))
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    photos = db.scalars(
        select(Photo).where(Photo.event_id == event_id).order_by(Photo.created_at.desc())
    ).all()
    return [photo_to_response(photo, event_name=event.name) for photo in photos]


@router.post("/event/{event_id}", response_model=PhotoUploadSummary, status_code=status.HTTP_201_CREATED)
async def upload_event_photos(
    event_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    storage_service: StorageService = Depends(get_storage_service_client),
    face_engine: FaceEngine = Depends(get_face_engine_service),
) -> dict:
    event = db.scalar(select(Event).where(Event.id == event_id))
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded")

    uploaded_photos: list[Photo] = []
    detected_faces = 0

    for file in files:
        content = await file.read()
        if not content:
            continue
        if file.content_type and not file.content_type.lower().startswith("image/"):
            # Ignore non-image files in mixed bulk uploads.
            continue

        try:
            stored = storage_service.upload_event_photo(str(event_id), file, content)
        except Exception as exc:
            logger.warning("Skipping file %s due to storage error: %s", file.filename, exc)
            continue
        photo = Photo(
            event_id=event_id,
            storage_key=stored.storage_key,
            url=stored.url,
            thumbnail_url=stored.thumbnail_url,
            captured_at=datetime.utcnow(),
            match_confidence=0.0,
        )
        db.add(photo)
        db.flush()

        try:
            faces = face_engine.extract_faces(content)
        except Exception as exc:
            # Preserve upload even if face extraction fails for a file format.
            logger.warning("Face extraction failed for %s: %s", file.filename, exc)
            faces = []
        detected_faces += len(faces)
        for face in faces:
            embedding_row = FaceEmbedding(
                event_id=event_id,
                photo_id=photo.id,
                embedding=face.embedding,
                source=EmbeddingSource.EVENT_PHOTO,
                face_box=face.box,
                confidence=face.confidence,
                model_name=face_engine.model_name,
            )
            db.add(embedding_row)

        uploaded_photos.append(photo)

    event.photo_count += len(uploaded_photos)
    event.match_count += detected_faces
    db.add(event)

    db.commit()
    for photo in uploaded_photos:
        db.refresh(photo)
    db.refresh(event)

    return {
        "uploaded": len(uploaded_photos),
        "facesDetected": detected_faces,
        "photos": [photo_to_response(photo, event_name=event.name) for photo in uploaded_photos],
    }


@router.get("/{photo_id}", response_model=PhotoResponse)
def get_photo(photo_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    photo = db.scalar(select(Photo).where(Photo.id == photo_id))
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    event = db.scalar(select(Event).where(Event.id == photo.event_id))
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return photo_to_response(photo, event_name=event.name)


@router.get("/{photo_id}/links", response_model=PhotoLinksResponse)
def get_photo_links(photo_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    photo = db.scalar(select(Photo).where(Photo.id == photo_id))
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    event = db.scalar(select(Event).where(Event.id == photo.event_id))
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    frontend_base = settings.frontend_base_url.rstrip("/")
    share_url = f"{frontend_base}/?event={event.access_code}&photo={photo.id}"
    return {
        "photoId": str(photo.id),
        "eventId": str(photo.event_id),
        "qrCode": event.access_code,
        "downloadUrl": photo.url,
        "shareUrl": share_url,
    }
