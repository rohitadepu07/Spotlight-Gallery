from datetime import date

from pydantic import BaseModel, ConfigDict


class EventCreate(BaseModel):
    name: str
    description: str | None = None
    event_date: date
    is_public: bool = True
    cover_image_url: str | None = None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    date: str
    photoCount: int
    matchCount: int
    isPublic: bool
    qrCode: str
    coverUrl: str | None = None


class EventJoinLinkResponse(BaseModel):
    eventId: str
    qrCode: str
    joinUrl: str
