import hashlib
import io
from dataclasses import dataclass
from typing import Protocol

from app.core.config import Settings


@dataclass
class DetectedFace:
    embedding: list[float]
    box: dict[str, int] | None = None
    confidence: float | None = None


class FaceEngine(Protocol):
    model_name: str

    def extract_faces(self, image_bytes: bytes) -> list[DetectedFace]:
        ...


class MockFaceEngine:
    model_name = "mock_hash_embedding"

    def __init__(self, dimensions: int = 128) -> None:
        self.dimensions = dimensions

    def extract_faces(self, image_bytes: bytes) -> list[DetectedFace]:
        # Deterministic fallback for development without heavy AI dependencies.
        digest = hashlib.sha256(image_bytes).digest()
        seed = int.from_bytes(digest[:8], "big")
        values: list[float] = []
        current = seed
        for _ in range(self.dimensions):
            current = (1103515245 * current + 12345) & 0x7FFFFFFF
            values.append((current / 0x7FFFFFFF) * 2 - 1)
        return [DetectedFace(embedding=values, box={"top": 0, "left": 0, "width": 100, "height": 100}, confidence=0.99)]


class FaceRecognitionEngine:
    model_name = "face_recognition_128d"

    def extract_faces(self, image_bytes: bytes) -> list[DetectedFace]:
        try:
            import face_recognition
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("face-recognition package is not installed.") from exc

        np_image = face_recognition.api.load_image_file(io.BytesIO(image_bytes))
        locations = face_recognition.face_locations(np_image, model="hog")
        encodings = face_recognition.face_encodings(np_image, known_face_locations=locations)

        faces: list[DetectedFace] = []
        for (top, right, bottom, left), encoding in zip(locations, encodings, strict=False):
            faces.append(
                DetectedFace(
                    embedding=[float(v) for v in encoding.tolist()],
                    box={
                        "top": int(top),
                        "left": int(left),
                        "width": int(max(right - left, 0)),
                        "height": int(max(bottom - top, 0)),
                    },
                    confidence=1.0,
                )
            )
        return faces


def get_face_engine(settings: Settings) -> FaceEngine:
    backend = settings.face_engine.lower()
    if backend == "face_recognition":
        return FaceRecognitionEngine()
    if backend == "mock":
        return MockFaceEngine(dimensions=settings.embedding_dimension)
    raise ValueError(f"Unsupported face engine: {backend}")
