from sqlalchemy import inspect, text

from app.db.session import engine
from app.models.base import Base
from app.models.event import Event  # noqa: F401
from app.models.face_embedding import FaceEmbedding  # noqa: F401
from app.models.photo import Photo  # noqa: F401
from app.models.student import StudentEnrollment, StudentUser  # noqa: F401


def ensure_schema_updates() -> None:
    inspector = inspect(engine)
    student_columns = {column["name"] for column in inspector.get_columns("student_users")}
    if "avatar_url" not in student_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE student_users ADD COLUMN avatar_url TEXT"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_schema_updates()
