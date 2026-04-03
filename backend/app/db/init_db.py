from app.db.session import engine
from app.models.base import Base
from app.models.event import Event  # noqa: F401
from app.models.face_embedding import FaceEmbedding  # noqa: F401
from app.models.photo import Photo  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

