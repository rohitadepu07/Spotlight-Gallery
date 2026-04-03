import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    access_code: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    photo_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    match_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    photos = relationship("Photo", back_populates="event", cascade="all, delete-orphan")
    embeddings = relationship("FaceEmbedding", back_populates="event", cascade="all, delete-orphan")

