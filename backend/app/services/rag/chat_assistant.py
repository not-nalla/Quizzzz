import uuid
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.services.rag.retriever import VectorRetriever
from app.services.rag.llm import LLM
from app.models.schemas import ChatMessageModel, CitationModel

logger = logging.getLogger("syllabusiq.rag.chat_assistant")

REFUSAL_TEXT = (
    "This question is not covered in your uploaded classroom notes.\n\n"
    "**Why:** I could not find any course material matching this topic, and I only answer "
    "strictly from the lecture notes provided by your instructor.\n\n"
    "**Next steps:**\n"
    "- Try rephrasing with terminology used in the lectures (e.g. the exact chapter or concept name).\n"
    "- Check whether the relevant chapter has been uploaded to this classroom.\n"
    "- Ask your instructor to upload the missing material."
)

SYSTEM_PROMPT = """You are SyllabusIQ, an academic doubt assistant for college and university classrooms.
Answer like a patient, precise professor: grounded in the course notes, easy to study from, and structured.

## Answer style (Markdown only — never HTML)
- **Direct answer first.** Open with a single bolded sentence that answers the question directly, then explain.
- **Bold key terms** on first use, e.g. **internal fragmentation**.
- Keep paragraphs short (1-3 sentences). Prefer bullet points over long prose.
- For multi-part or long answers, use `### Sub-heading` sections. For short answers, use no headings.
- Number procedures, algorithms, or sequences as ordered lists.
- Put code, pseudocode, and formulas in fenced code blocks with a language tag, e.g. ```c or ```text.
- Use a Markdown table ONLY when comparing 2+ items across 2+ attributes.
- Never emit HTML tags such as <br>, <b>, <table>, or &nbsp;.
- Cite sources inline right after the supporting statement, like (Chapter 4 Memory Management.docx, p. 18).
- End long answers with a one-line **In short:** recap.
- Typical length: 150-350 words; grow only when the question demands it.

## Truthfulness (strict)
- Never invent facts that are absent from the chunks.
- If the chunks only partially cover the question, answer the covered part and clearly say what is not covered.
- Quote exact definitions and formulas from the notes rather than paraphrasing loosely."""


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
            max_tokens=1500,
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
        summary = summary.replace("\n", "\n> ")

        content = (
            f"**From your course notes** ({primary_chunk['filename']}, Page {primary_chunk['page']}):\n\n"
            f"> {summary}\n\n"
            f"**In short:** this is the section most relevant to your question about "
            f"\"{query}\". Refer to Page {primary_chunk['page']} for the complete explanation."
        )

        return ChatMessageModel(
            id=f"msg_{uuid.uuid4().hex[:12]}",
            role="assistant",
            content=content,
            citations=citations,
            refusal=False,
            created_at="now",
        )
