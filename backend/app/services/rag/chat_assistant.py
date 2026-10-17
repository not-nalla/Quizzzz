import uuid
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.services.rag.retriever import VectorRetriever
from app.services.rag.llm import LLM
from app.models.schemas import ChatMessageModel, CitationModel

logger = logging.getLogger("syllabusiq.rag.chat_assistant")

REFUSAL_TEXT = (
    "This question is not covered in your uploaded classroom notes. "
    "The AI assistant strictly answers from course materials provided by your instructor."
)

SYSTEM_PROMPT = """You are SyllabusIQ, an academic doubt assistant for college and university classrooms.
Answer the student's question strictly and accurately using ONLY the provided course notes chunks.
Rules:
- Never invent facts that are absent from the chunks.
- Cite source filenames and page numbers inline where they support the answer.
- Be technical and precise: keep definitions, mechanisms, formulas, and step-by-step reasoning exact.
- If the chunks only partially cover the question, answer the covered part and say what is not covered.
- Keep the explanation clear, clinical, and structured with short paragraphs or bullets."""


class ChatAssistant:
    @classmethod
    async def answer_doubt(
        cls,
        classroom_id: str,
        query: str,
        history: Optional[List[Dict[str, str]]] = None,
        doc_id: Optional[str] = None,
    ) -> ChatMessageModel:
        # 1. Retrieve top-K chunks scoped strictly to classroom_id (BOT-1)
        top_chunks = await VectorRetriever.retrieve_top_k(
            classroom_id=classroom_id,
            query=query,
            top_k=4,
            doc_id=doc_id,
        )

        # 2. Cosine/lexical relevance gate (BOT-2)
        top_score = top_chunks[0]["score"] if top_chunks else 0.0
        cutoff = settings.COSINE_SIMILARITY_CUTOFF

        if not top_chunks or top_score < cutoff:
            return ChatMessageModel(
                id=f"msg_{uuid.uuid4().hex[:12]}",
                role="assistant",
                content=REFUSAL_TEXT,
                citations=[],
                refusal=True,
                created_at="now",
            )

        citations = [
            CitationModel(
                doc_id=c["doc_id"],
                filename=c["filename"],
                page=c["page"],
                text=c["text"][:240] + ("..." if len(c["text"]) > 240 else ""),
                score=round(c["score"], 3),
            )
            for c in top_chunks
        ]

        context_blocks = "\n\n".join(
            [
                f"[Source: {c['filename']} - Page {c['page']}]:\n{c['text']}"
                for c in top_chunks
            ]
        )

        user_content = f"""Classroom Notes Chunks:
{context_blocks}

Student Doubt: {query}"""

        # 3. LLM answer grounded in the retrieved chunks (Groq, then Gemini)
        try:
            answer_text = await LLM.complete(
                system=SYSTEM_PROMPT,
                user=user_content,
                history=history,
                temperature=0.2,
                max_tokens=900,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("Doubt generation error: %s", e)
            answer_text = None

        if answer_text:
            return ChatMessageModel(
                id=f"msg_{uuid.uuid4().hex[:12]}",
                role="assistant",
                content=answer_text.strip(),
                citations=citations,
                refusal=False,
                created_at="now",
            )

        # 4. Deterministic grounded response referencing the highest scoring chunk
        primary_chunk = top_chunks[0]
        text = primary_chunk["text"]
        summary = text if len(text) < 500 else text[:480] + "..."

        content = (
            f"Based on your course notes ({primary_chunk['filename']}, Page {primary_chunk['page']}):\n\n"
            f"{summary}\n\n"
            f"This addresses your question regarding '{query}'. "
            f"Refer to Page {primary_chunk['page']} for the complete section."
        )

        return ChatMessageModel(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            role="assistant",
            content=content,
            citations=citations,
            refusal=False,
            created_at="now",
        )
