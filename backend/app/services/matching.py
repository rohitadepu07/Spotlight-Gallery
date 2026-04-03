import math
import uuid
from collections import defaultdict


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("Embedding dimensions do not match.")
    dot_product = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


def rank_photo_matches(
    selfie_embedding: list[float],
    embedding_rows: list[tuple[uuid.UUID | None, list[float]]],
    threshold: float,
) -> list[tuple[uuid.UUID, float]]:
    best_scores: dict[uuid.UUID, float] = defaultdict(float)

    for photo_id, embedding in embedding_rows:
        if photo_id is None:
            continue
        score = cosine_similarity(selfie_embedding, embedding)
        if score >= threshold and score > best_scores[photo_id]:
            best_scores[photo_id] = score

    return sorted(best_scores.items(), key=lambda item: item[1], reverse=True)

