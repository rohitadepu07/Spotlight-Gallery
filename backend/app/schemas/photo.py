from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    url: str
    thumbnailUrl: str
    thumbnail: str
    event: str
    eventId: str
    timestamp: str
    matchConfidence: float


class PhotoUploadSummary(BaseModel):
    uploaded: int
    facesDetected: int
    photos: list[PhotoResponse]


class MatchResponse(BaseModel):
    eventId: str
    matchesFound: int
    threshold: float
    photos: list[PhotoResponse]
    scannedAt: datetime


class PhotoLinksResponse(BaseModel):
    photoId: str
    eventId: str
    qrCode: str
    downloadUrl: str
    shareUrl: str
