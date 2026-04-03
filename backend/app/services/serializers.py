from app.models.event import Event
from app.models.photo import Photo

DEFAULT_COVER_URL = "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"


def format_event_date(value) -> str:
    return value.strftime("%B %d, %Y").replace(" 0", " ")


def event_to_response(event: Event) -> dict:
    return {
        "id": str(event.id),
        "name": event.name,
        "description": event.description,
        "date": format_event_date(event.event_date),
        "photoCount": event.photo_count,
        "matchCount": event.match_count,
        "isPublic": event.is_public,
        "qrCode": event.access_code,
        "coverUrl": event.cover_image_url or DEFAULT_COVER_URL,
    }


def photo_to_response(photo: Photo, *, event_name: str, match_confidence: float | None = None) -> dict:
    confidence = photo.match_confidence if match_confidence is None else match_confidence
    timestamp_value = photo.captured_at or photo.created_at
    return {
        "id": str(photo.id),
        "url": photo.url,
        "thumbnailUrl": photo.thumbnail_url or photo.url,
        "thumbnail": photo.thumbnail_url or photo.url,
        "event": event_name,
        "eventId": str(photo.event_id),
        "timestamp": timestamp_value.isoformat(),
        "matchConfidence": round(float(confidence), 4),
    }
