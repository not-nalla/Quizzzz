import math
import re
import logging
from typing import List, Dict, Any, Optional
from app.core.database import get_database
from app.services.ingestion.embedder import VectorEmbedder

logger = logging.getLogger("syllabusiq.rag.retriever")

STOPWORDS = {
    "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had",
    "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how",
    "man", "new", "now", "old", "see", "two", "way", "who", "did", "its", "let",
    "she", "too", "use", "that", "with", "have", "this", "will", "your", "from",
    "they", "know", "want", "been", "good", "much", "some", "time", "very",
    "when", "come", "here", "just", "like", "long", "make", "many", "more",
    "only", "over", "such", "take", "than", "them", "well", "were", "what",
    "does", "about", "which", "their", "there", "would", "could", "should",
    "explain", "question", "following", "statement", "statements", "according",
}

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def content_tokens(text: str) -> List[str]:
    return [
        tok
        for tok in _TOKEN_RE.findall((text or "").lower())
        if len(tok) > 2 and tok not in STOPWORDS
    ]


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def lexical_coverage(query: str, document: str) -> float:
    """Fraction of the question's content words that literally appear in the note."""
    qa = set(content_tokens(query))
    qb = set(content_tokens(document))
    if not qa:
        return 0.0
    return len(qa & qb) / len(qa)


def lexical_similarity(query: str, document: str) -> float:
    """Sørensen-Dice overlap over content words. Robust when embeddings are hash-projected."""
    qa = set(content_tokens(query))
    qb = set(content_tokens(document))
    if not qa or not qb:
        return 0.0
    overlap = len(qa & qb)
    return (2.0 * overlap) / (len(qa) + len(qb))


def relevance_score(query: str, document: str, vector_a: List[float], vector_b: List[float]) -> float:
    return max(
        cosine_similarity(vector_a, vector_b),
        lexical_coverage(query, document),
        lexical_similarity(query, document),
    )


class VectorRetriever:
    @classmethod
    async def retrieve_top_k(
        cls,
        classroom_id: str,
        query: str,
        top_k: int = 5,
        unit: Optional[str] = None,
        doc_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        db = get_database()
        if db is None:
            return []

        # Embed user query
        query_vector = await VectorEmbedder.embed_query(query)

        # Build MongoDB query scoped strictly to classroom_id (and optionally one note)
        filter_query: Dict[str, Any] = {"classroom_id": classroom_id}
        if unit:
            filter_query["unit"] = unit
        if doc_id:
            filter_query["doc_id"] = doc_id

        cursor = db.chunks.find(filter_query)
        chunks = await cursor.to_list(length=1000)

        if not chunks:
            return []

        # Calculate hybrid relevance scores (vector cosine + lexical grounding)
        scored_chunks = []
        for chk in chunks:
            chunk_vector = chk.get("vector") or chk.get("embedding", [])
            text = chk.get("text", "")
            score = relevance_score(query, text, query_vector, chunk_vector)

            doc_id_value = chk.get("doc_id")
            filename = chk.get("filename")
            if not filename:
                doc = await db.documents.find_one({"_id": doc_id_value})
                filename = (doc or {}).get("filename", "Courseware Document")

            scored_chunks.append({
                "chunk_id": str(chk["_id"]),
                "doc_id": str(doc_id_value),
                "filename": filename,
                "text": text,
                "page": chk.get("page", 1),
                "unit": chk.get("unit"),
                "topic": chk.get("topic"),
                "score": float(score),
            })

        # Sort descending by relevance score
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]
