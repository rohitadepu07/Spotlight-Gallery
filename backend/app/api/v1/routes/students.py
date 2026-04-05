import hashlib
import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.event import Event
from app.models.face_embedding import EmbeddingSource, FaceEmbedding
from app.models.photo import Photo
from app.models.student import StudentEnrollment, StudentUser
from app.schemas.auth import StudentAuthResponse, StudentEnrollRequest, StudentLoginRequest, UserProfile
from app.schemas.event import EventResponse
from app.schemas.photo import PhotoResponse
from app.services.dependencies import get_face_engine_service
from app.services.face_engine import FaceEngine
from app.services.matching import rank_photo_matches
from app.services.storage import StorageService
from app.services.dependencies import get_storage_service_client
from app.services.serializers import event_to_response, photo_to_response

router = APIRouter(prefix="/students", tags=["students"])
logger = logging.getLogger(__name__)


def hash_password(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def to_student_profile(student: StudentUser) -> UserProfile:
    return UserProfile(
        id=str(student.id),
        name=student.name,
        email=student.email,
        phone="",
        bio="Event student",
        avatarUrl=student.avatar_url,
        role="participant",
    )


def resolve_event(identifier: str, db: Session) -> Event | None:
    event = None
    try:
        event_uuid = uuid.UUID(identifier)
        event = db.scalar(select(Event).where(Event.id == event_uuid))
    except ValueError:
        event = db.scalar(
            select(Event).where(
                or_(Event.slug == identifier.lower(), Event.access_code == identifier.upper())
            )
        )
    return event


@router.post("/register", response_model=StudentAuthResponse, status_code=status.HTTP_201_CREATED)
async def student_register(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    selfie: UploadFile = File(...),
    db: Session = Depends(get_db),
    face_engine: FaceEngine = Depends(get_face_engine_service),
    storage_service: StorageService = Depends(get_storage_service_client),
) -> dict:
    normalized_email = email.strip().lower()
    if not normalized_email or not password.strip() or not name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name, email and password are required")

    existing = db.scalar(select(StudentUser).where(StudentUser.email == normalized_email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    selfie_bytes = await selfie.read()
    if not selfie_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selfie image is required")

    faces = face_engine.extract_faces(selfie_bytes)
    if not faces:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No face detected in selfie image.",
        )

    avatar_url: str | None = None
    try:
        stored_selfie = storage_service.upload_event_photo("students", selfie, selfie_bytes)
        avatar_url = stored_selfie.url
    except Exception as exc:
        logger.warning("Could not store student selfie for %s: %s", normalized_email, exc)

    student = StudentUser(
        name=name.strip(),
        email=normalized_email,
        password_hash=hash_password(password.strip()),
        avatar_url=avatar_url,
        selfie_embedding=faces[0].embedding,
        selfie_model_name=face_engine.model_name,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return {
        "status": "created",
        "profile": to_student_profile(student).model_dump(),
    }


@router.post("/login", response_model=StudentAuthResponse)
def student_login(payload: StudentLoginRequest, db: Session = Depends(get_db)) -> dict:
    email = payload.email.strip().lower()
    password = payload.password.strip()
    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid username or password")

    student = db.scalar(select(StudentUser).where(StudentUser.email == email))
    if not student or student.password_hash != hash_password(password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return {
        "status": "ok",
        "profile": to_student_profile(student).model_dump(),
    }


@router.post("/{student_id}/enroll", response_model=EventResponse)
def enroll_in_event(
    student_id: uuid.UUID,
    payload: StudentEnrollRequest,
    db: Session = Depends(get_db),
) -> dict:
    student = db.scalar(select(StudentUser).where(StudentUser.id == student_id))
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    event = resolve_event(payload.code.strip(), db)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    enrollment = db.scalar(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student_id,
            StudentEnrollment.event_id == event.id,
        )
    )
    if not enrollment:
        db.add(StudentEnrollment(student_id=student_id, event_id=event.id))
        db.commit()

    return event_to_response(event)


@router.get("/{student_id}/events", response_model=list[EventResponse])
def list_student_events(student_id: uuid.UUID, db: Session = Depends(get_db)) -> list[dict]:
    student = db.scalar(select(StudentUser).where(StudentUser.id == student_id))
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    events = db.scalars(
        select(Event)
        .join(StudentEnrollment, StudentEnrollment.event_id == Event.id)
        .where(StudentEnrollment.student_id == student_id)
        .order_by(Event.created_at.desc())
    ).all()
    return [event_to_response(event) for event in events]


@router.get("/{student_id}/events/{event_id}/photos", response_model=list[PhotoResponse])
def list_student_matched_photos(
    student_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[dict]:
    settings = get_settings()
    student = db.scalar(select(StudentUser).where(StudentUser.id == student_id))
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    event = db.scalar(select(Event).where(Event.id == event_id))
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    enrolled = db.scalar(
        select(StudentEnrollment).where(
            StudentEnrollment.student_id == student_id,
            StudentEnrollment.event_id == event_id,
        )
    )
    if not enrolled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is not enrolled in this event")

    if not student.selfie_embedding:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Student selfie embedding is missing. Please re-register.",
        )

    all_embeddings = db.scalars(
        select(FaceEmbedding).where(
            FaceEmbedding.event_id == event_id,
            FaceEmbedding.source == EmbeddingSource.EVENT_PHOTO,
        )
    ).all()

    ranked = rank_photo_matches(
        student.selfie_embedding,
        [(row.photo_id, row.embedding) for row in all_embeddings],
        threshold=settings.match_threshold,
    )
    if not ranked:
        return []

    photo_lookup = {
        str(photo.id): photo
        for photo in db.scalars(
            select(Photo).where(Photo.id.in_([photo_id for photo_id, _ in ranked]))
        ).all()
    }

    response: list[dict] = []
    for photo_id, score in ranked:
        photo = photo_lookup.get(str(photo_id))
        if not photo:
            continue
        response.append(photo_to_response(photo, event_name=event.name, match_confidence=score))
    return response
