import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventJoinLinkResponse, EventResponse
from app.services.naming import generate_access_code, slugify
from app.services.serializers import event_to_response

router = APIRouter(prefix="/events", tags=["events"])


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


@router.get("/", response_model=list[EventResponse])
def list_events(
    include_private: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = select(Event).order_by(Event.created_at.desc())
    if not include_private:
        query = query.where(Event.is_public.is_(True))
    events = db.scalars(query).all()
    return [event_to_response(event) for event in events]


@router.get("/{identifier}", response_model=EventResponse)
def get_event(identifier: str, db: Session = Depends(get_db)) -> dict:
    event = resolve_event(identifier, db)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event_to_response(event)


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_db)) -> dict:
    normalized_name = payload.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event name is required")

    existing_event = db.scalar(select(Event).where(func.lower(Event.name) == normalized_name.lower()))
    if existing_event:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An event with this name already exists",
        )

    base_slug = slugify(normalized_name)
    slug_candidate = base_slug
    suffix = 1
    while db.scalar(select(func.count()).select_from(Event).where(Event.slug == slug_candidate)):
        suffix += 1
        slug_candidate = f"{base_slug}-{suffix}"

    access_code = generate_access_code()
    while db.scalar(select(func.count()).select_from(Event).where(Event.access_code == access_code)):
        access_code = generate_access_code()

    event = Event(
        slug=slug_candidate,
        name=normalized_name,
        description=payload.description,
        event_date=payload.event_date if isinstance(payload.event_date, date) else date.today(),
        is_public=payload.is_public,
        access_code=access_code,
        cover_image_url=payload.cover_image_url,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event_to_response(event)


@router.patch("/{event_id}/toggle-visibility", response_model=EventResponse)
def toggle_event_visibility(event_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    event = db.scalar(select(Event).where(Event.id == event_id))
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event.is_public = not event.is_public
    db.add(event)
    db.commit()
    db.refresh(event)
    return event_to_response(event)


@router.get("/{identifier}/join-link", response_model=EventJoinLinkResponse)
def get_event_join_link(identifier: str, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    event = resolve_event(identifier, db)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    frontend_base = settings.frontend_base_url.rstrip("/")
    join_url = f"{frontend_base}/?event={event.access_code}"
    return {
        "eventId": str(event.id),
        "qrCode": event.access_code,
        "joinUrl": join_url,
    }
