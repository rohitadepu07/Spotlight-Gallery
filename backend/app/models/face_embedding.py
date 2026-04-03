import enum
import uuid
from typing import Any

from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class EmbeddingSource(str, enum.Enum):
    EVENT_PHOTO = "event_photo"
    GUEST_SELFIE = "guest_selfie"


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    photo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("photos.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    embedding: Mapped[list[float]] = mapped_column(ARRAY(Float), nullable=False)
    source: Mapped[EmbeddingSource] = mapped_column(
        Enum(EmbeddingSource, name="embedding_source"),
        default=EmbeddingSource.EVENT_PHOTO,
        nullable=False,
    )
    face_box: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_name: Mapped[str] = mapped_column(String(80), default="face_recognition_128d", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    event = relationship("Event", back_populates="embeddings")
    photo = relationship("Photo", back_populates="embeddings")


Index("ix_face_embeddings_event_photo", FaceEmbedding.event_id, FaceEmbedding.photo_id)
