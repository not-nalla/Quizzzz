import uuid
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.services.rag.retriever import VectorRetriever
from app.services.rag.llm import LLM
from app.models.schemas import QuestionModel, QuizOption, SourceRef, Difficulty

logger = logging.getLogger("syllabusiq.rag.generator")

SYSTEM_PROMPT = """You are an academic assessment author for higher education university courses.
Generate high-quality multiple choice questions strictly grounded in the provided course notes chunks.
Do not invent any facts that are not present in the chunks.
You MUST output ONLY a valid JSON object with the key "questions" containing an array of questions in this format:
{
  "questions": [
    {
      "question": "question stem text",
      "options": [
        {"opt_id": "opt_1", "text": "choice A"},
        {"opt_id": "opt_2", "text": "choice B"},
        {"opt_id": "opt_3", "text": "choice C"},
        {"opt_id": "opt_4", "text": "choice D"}
      ],
      "correct_opt_id": "opt_1",
      "explanation": "explanation referencing chunk fact",
      "difficulty": "easy",
      "topic": "topic name",
      "source_chunk_idx": 1
    }
  ]
}
Rules:
- Exactly 4 options per question, with opt_id values opt_1..opt_4.
- Distribute correct_opt_id across opt_1..opt_4; never put the correct answer in the same position every time.
- difficulty must be one of: easy, medium, hard.
- source_chunk_idx is the 1-based index of the chunk the question is derived from."""


def _normalize_questions(raw_items: Any, retrieved_chunks: List[Dict[str, Any]], unit: Optional[str], difficulty: str) -> List[QuestionModel]:
    questions: List[QuestionModel] = []
    if not isinstance(raw_items, list):
        return questions

    for item in raw_items:
        if not isinstance(item, dict) or not item.get("question"):
            continue
        options_raw = item.get("options") or []
        options: List[QuizOption] = []
        for idx, opt in enumerate(options_raw):
            if isinstance(opt, dict):
                opt_id = str(opt.get("opt_id") or f"opt_{idx + 1}")
                text = str(opt.get("text") or "").strip()
            else:
                opt_id = f"opt_{idx + 1}"
                text = str(opt).strip()
            if text:
                options.append(QuizOption(opt_id=opt_id, text=text))
        if len(options) < 2:
            continue

        correct = str(item.get("correct_opt_id") or "").strip()
        valid_ids = {o.opt_id for o in options}
        if correct not in valid_ids:
            correct = options[0].opt_id

        chunk_idx = item.get("source_chunk_idx", 1)
        try:
            chunk_idx = int(chunk_idx)
        except (TypeError, ValueError):
            chunk_idx = 1
        source_chunk = retrieved_chunks[min(max(chunk_idx - 1, 0), len(retrieved_chunks) - 1)] if retrieved_chunks else None

        diff_val = item.get("difficulty", "medium")
        if diff_val not in ("easy", "medium", "hard"):
            diff_val = "medium"
        if difficulty in ("easy", "medium", "hard"):
            diff_val = difficulty

        questions.append(
            QuestionModel(
                q_id=f"q_{uuid.uuid4().hex[:8]}",
                question=str(item["question"]).strip(),
                options=options,
                correct_opt_id=correct,
                explanation=str(item.get("explanation") or "Derived directly from the uploaded course notes.").strip(),
                difficulty=diff_val,
                topic=str(item.get("topic") or unit or "Course Concepts").strip(),
                source_chunk_ids=[source_chunk["chunk_id"]] if source_chunk else [],
                source_refs=[SourceRef(doc_id=source_chunk["doc_id"], filename=source_chunk["filename"], page=source_chunk["page"])] if source_chunk else [],
            )
        )
    return questions


def _distractor_pool(chunk_text: str) -> List[str]:
    sentences = [s.strip() for s in chunk_text.replace("\n", " ").split(".") if len(s.strip()) > 30]
    pool = [
        "It is achieved by disabling all hardware interrupts during execution.",
        "It requires replicating every data structure across secondary storage.",
        "It eliminates the need for any address translation hardware.",
        "It only applies to real-time systems and never to general purpose kernels.",
        "It guarantees constant-time access irrespective of memory hierarchy.",
        "It works by compressing machine instructions before every fetch cycle.",
    ]
    if sentences:
        pool.insert(0, sentences[-1][:180])
    return pool


def _fallback_questions(
    retrieved_chunks: List[Dict[str, Any]],
    count: int,
    difficulty: str,
    unit: Optional[str],
) -> List[QuestionModel]:
    """Deterministic grounded synthesizer used only when no LLM provider is reachable."""
    questions: List[QuestionModel] = []
    if not retrieved_chunks:
        return questions

    diff_choice: Difficulty = difficulty if difficulty in ("easy", "medium", "hard") else "medium"
    per_chunk = max(1, -(-count // len(retrieved_chunks)))

    for idx, chunk in enumerate(retrieved_chunks[:count]):
        if len(questions) >= count:
            break
        text = chunk["text"]
        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 30]
        topic_name = chunk.get("topic") or unit or f"Topic {idx + 1}"
        pool = _distractor_pool(text)

        for sentence in sentences[: max(1, per_chunk)]:
            if len(questions) >= count:
                break
            correct_slot = len(questions) % 4
            correct_text = sentence if sentence.endswith(".") else f"{sentence}."
            distractors = [d for d in pool if d != correct_text][:3]
            while len(distractors) < 3:
                distractors.append(
                    "It is unrelated to the mechanism described in the course notes."
                )
            option_texts = list(distractors)
            option_texts.insert(correct_slot, correct_text)

            options = [QuizOption(opt_id=f"opt_{i + 1}", text=t) for i, t in enumerate(option_texts)]
            questions.append(
                QuestionModel(
                    q_id=f"q_{uuid.uuid4().hex[:8]}",
                    question=(
                        f"With reference to {topic_name} in {chunk['filename']} (page {chunk['page']}), "
                        f"which of the following statements is consistent with the course notes?"
                    ),
                    options=options,
                    correct_opt_id=f"opt_{correct_slot + 1}",
                    explanation=f"Verified against the uploaded notes: \"{correct_text}\"",
                    difficulty=diff_choice,
                    topic=topic_name,
                    source_chunk_ids=[chunk["chunk_id"]],
                    source_refs=[SourceRef(doc_id=chunk["doc_id"], filename=chunk["filename"], page=chunk["page"])],
                )
            )
    return questions


class QuizGenerator:
    @classmethod
    async def generate_quiz_questions(
        cls,
        classroom_id: str,
        title: str,
        count: int = 10,
        difficulty: str = "mixed",
        unit: Optional[str] = None,
        doc_id: Optional[str] = None,
    ) -> List[QuestionModel]:
        # 1. Retrieve top-K grounded syllabus chunks (optionally scoped to a single uploaded note)
        query_context = f"{title} {unit or ''} core assessment concepts"
        retrieved_chunks = await VectorRetriever.retrieve_top_k(
            classroom_id=classroom_id,
            query=query_context,
            top_k=min(max(count * 2, 8), 24),
            unit=unit,
            doc_id=doc_id,
        )

        if not retrieved_chunks and doc_id:
            # Fall back to the whole classroom knowledge base if the note yielded nothing.
            retrieved_chunks = await VectorRetriever.retrieve_top_k(
                classroom_id=classroom_id,
                query=query_context,
                top_k=min(max(count * 2, 8), 24),
                unit=unit,
            )

        if not retrieved_chunks:
            logger.warning("No indexed chunks found for classroom %s", classroom_id)
            return []

        context_text = "\n\n".join(
            [
                f"[Chunk {idx + 1} | Document: {c['filename']} | Page: {c['page']}]:\n{c['text']}"
                for idx, c in enumerate(retrieved_chunks[:12])
            ]
        )

        user_prompt = f"""Generate exactly {count} multiple choice questions.
Desired difficulty: {difficulty}
Unit/Topic scope: {unit or title}

Classroom Chunks:
{context_text}"""

        # 2. LLM authoring (Groq first, Gemini second, both via the shared client)
        questions: List[QuestionModel] = []
        if retrieved_chunks:
            try:
                payload = await LLM.complete_json(
                    system=SYSTEM_PROMPT,
                    user=user_prompt,
                    temperature=0.3,
                    max_tokens=2200,
                )
                if isinstance(payload, dict):
                    payload = payload.get("questions")
                questions = _normalize_questions(payload, retrieved_chunks, unit, difficulty)
                if len(questions) > count:
                    questions = questions[:count]
            except Exception as e:  # noqa: BLE001
                logger.warning("LLM quiz generation error: %s", e)

        # 3. Deterministic grounded top-up when the LLM returned too few questions
        if len(questions) < count:
            needed = count - len(questions)
            covered = {qid for q in questions for qid in q.source_chunk_ids}
            remaining_chunks = [c for c in retrieved_chunks if c["chunk_id"] not in covered] or retrieved_chunks
            top_up = _fallback_questions(remaining_chunks, needed, difficulty, unit)
            existing_correct = {q.correct_opt_id for q in questions}
            for extra in top_up:
                if len(questions) >= count:
                    break
                questions.append(extra)
            logger.info(
                "Quiz generation topped up with %d grounded fallback question(s) (llm=%s, correct_keys=%s)",
                len(top_up),
                bool(existing_correct),
                [q.correct_opt_id for q in questions],
            )

        return questions[:count]
