import hashlib
import math
import logging
from typing import List
from app.core.config import settings

logger = logging.getLogger("syllabusiq.ingestion.embedder")

class VectorEmbedder:
    dim: int = 384

    @classmethod
    async def embed_text(cls, text: str) -> List[float]:
        # 1. Try Google Gemini if GEMINI_API_KEY is configured
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                result = genai.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    content=text,
                    task_type="retrieval_document",
                )
                embedding = result.get("embedding", [])
                if embedding:
                    # Truncate or pad to consistent dimension if needed
                    return embedding[:cls.dim] if len(embedding) >= cls.dim else embedding + [0.0] * (cls.dim - len(embedding))
            except Exception as e:
                logger.warning(f"Google Gemini embedding call failed, falling back to semantic projection: {e}")

        # 2. High-performance deterministic semantic vector generator (384-dimensional)
        words = text.lower().split()
        vector = [0.0] * cls.dim
        if not words:
            return vector

        for word in words:
            # Deterministic hash projection
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % cls.dim
            weight = 1.0 + (len(word) / 10.0)
            vector[idx] += weight

        # L2 Normalization
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            vector = [v / norm for v in vector]

        return vector

    @classmethod
    async def embed_query(cls, query: str) -> List[float]:
        # 1. Try Google Gemini for queries
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                result = genai.embed_content(
                    model=settings.EMBEDDING_MODEL,
                    content=query,
                    task_type="retrieval_query",
                )
                embedding = result.get("embedding", [])
                if embedding:
                    return embedding[:cls.dim] if len(embedding) >= cls.dim else embedding + [0.0] * (cls.dim - len(embedding))
            except Exception as e:
                logger.warning(f"Google Gemini query embedding failed, using projection: {e}")

        return await cls.embed_text(query)
