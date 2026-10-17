import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import (
    QuizCreateRequest,
    QuizPublishRequest,
    QuizResponse,
    StudentQuizResponse,
    QuestionModel,
    QuestionUpdateRequest,
    QuizOption,
    StudentQuestionModel,
    QuizSettingsModel,
)
from app.core.database import get_database
from app.core.deps import get_current_user, require_teacher
from app.services.rag.generator import QuizGenerator
from app.services.rag.retriever import VectorRetriever
from app.services.rag.llm import LLM

router = APIRouter(tags=["Quizzes & Assessments"])

@router.post("/classrooms/{classroom_id}/quizzes/generate", response_model=QuizResponse)
async def generate_quiz(
    classroom_id: str,
    req: QuizCreateRequest,
    current_user: dict = Depends(require_teacher),
):
    db = get_database()
    quiz_id = f"qz_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Look up classroom name
    classroom_name = "Classroom"
    if db is not None:
        c = await db.classrooms.find_one({"_id": classroom_id})
        if c:
            classroom_name = c["name"]

    # Generate questions via RAG generator, scoped to the selected note when provided
    questions = await QuizGenerator.generate_quiz_questions(
        classroom_id=classroom_id,
        title=req.title,
        count=req.count,
        difficulty=req.difficulty,
        unit=req.unit,
        doc_id=req.doc_id,
    )

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No indexed course notes were found for this scope. Upload lecture notes before generating a quiz.",
        )

    total_marks = len(questions) * 10
    default_settings = QuizSettingsModel(
        start_at=now_iso,
        deadline=datetime.fromtimestamp(datetime.now().timestamp() + 7 * 86400).isoformat(),
        duration_min=25,
        attempts_allowed=1,
        shuffle_questions=True,
        shuffle_options=True,
        show_results="immediate",
    )

    quiz_doc = {
        "_id": quiz_id,
        "classroom_id": classroom_id,
        "classroom_name": classroom_name,
        "created_by": current_user["id"],
        "title": req.title,
        "status": "draft",
        "total_marks": total_marks,
        "questions": [q.model_dump() for q in questions],
        "settings": default_settings.model_dump(),
        "created_at": now_iso,
        "published_at": None,
        "attempt_count": 0,
        "locked": False,
    }

    if db is not None:
        await db.quizzes.insert_one(quiz_doc)

    return QuizResponse(
        id=quiz_id,
        classroom_id=classroom_id,
        classroom_name=classroom_name,
        title=req.title,
        status="draft",
        total_marks=total_marks,
        questions=questions,
        settings=default_settings,
        created_at=now_iso,
        published_at=None,
        attempt_count=0,
        locked=False,
    )

@router.get("/classrooms/{classroom_id}/quizzes")
async def list_quizzes(
    classroom_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    quizzes = []

    if db is not None:
        cursor = db.quizzes.find({"classroom_id": classroom_id}).sort("created_at", -1)
        async for q in cursor:
            is_teacher = current_user["role"] == "teacher"
            q_id = str(q["_id"])
            q_status = q["status"]

            # If user is student, do not show unreleased drafts
            if not is_teacher and q_status == "draft":
                continue

            attempts_count = await db.attempts.count_documents({"quiz_id": q_id})
            student_attempts = 0
            best_score = None
            if not is_teacher:
                user_attempts = await db.attempts.find({"quiz_id": q_id, "student_id": current_user["id"]}).to_list(10)
                student_attempts = len(user_attempts)
                scores = [att.get("score") for att in user_attempts if att.get("score") is not None]
                if scores:
                    best_score = max(scores)

            questions_raw = q.get("questions", [])
            questions_models = [QuestionModel(**item) for item in questions_raw]

            if is_teacher:
                quizzes.append(QuizResponse(
                    id=q_id,
                    classroom_id=q["classroom_id"],
                    classroom_name=q.get("classroom_name", "Course"),
                    title=q["title"],
                    status=q_status,
                    total_marks=q["total_marks"],
                    questions=questions_models,
                    settings=QuizSettingsModel(**q["settings"]),
                    created_at=q["created_at"],
                    published_at=q.get("published_at"),
                    attempt_count=attempts_count,
                    locked=q.get("locked", False) or (attempts_count > 0),
                ))
            else:
                # Student view with Zero Answer Exposure
                quizzes.append(StudentQuizResponse(
                    id=q_id,
                    classroom_id=q["classroom_id"],
                    classroom_name=q.get("classroom_name", "Course"),
                    title=q["title"],
                    status=q_status,
                    total_marks=q["total_marks"],
                    question_count=len(questions_models),
                    settings=QuizSettingsModel(**q["settings"]),
                    created_at=q["created_at"],
                    published_at=q.get("published_at"),
                    attempts_used=student_attempts,
                    attempts_allowed=q["settings"].get("attempts_allowed", 1),
                    best_score=best_score,
                    availability="open",
                ))

    return quizzes

@router.get("/quizzes/{quiz_id}")
async def get_quiz(
    quiz_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    if db is not None:
        q = await db.quizzes.find_one({"_id": quiz_id})
        if q:
            is_teacher = current_user["role"] == "teacher"
            questions_raw = q.get("questions", [])
            
            if is_teacher:
                return QuizResponse(
                    id=str(q["_id"]),
                    classroom_id=q["classroom_id"],
                    classroom_name=q.get("classroom_name", "Course"),
                    title=q["title"],
                    status=q["status"],
                    total_marks=q["total_marks"],
                    questions=[QuestionModel(**item) for item in questions_raw],
                    settings=QuizSettingsModel(**q["settings"]),
                    created_at=q["created_at"],
                    published_at=q.get("published_at"),
                    attempt_count=await db.attempts.count_documents({"quiz_id": quiz_id}),
                    locked=q.get("locked", False),
                )
            else:
                # Student sanitized view
                sanitized_questions = [
                    StudentQuestionModel(
                        q_id=item["q_id"],
                        question=item["question"],
                        options=item["options"],
                        difficulty=item["difficulty"],
                        topic=item["topic"],
                    )
                    for item in questions_raw
                ]
                return {
                    "id": str(q["_id"]),
                    "classroom_id": q["classroom_id"],
                    "classroom_name": q.get("classroom_name", "Course"),
                    "title": q["title"],
                    "status": q["status"],
                    "total_marks": q["total_marks"],
                    "questions": sanitized_questions,
                    "settings": QuizSettingsModel(**q["settings"]),
                }

    raise HTTPException(status_code=404, detail="Quiz not found")

@router.put("/quizzes/{quiz_id}/questions/{q_id}")
async def update_question(
    quiz_id: str,
    q_id: str,
    updated_q: QuestionUpdateRequest,
    current_user: dict = Depends(require_teacher),
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database offline")

    quiz = await db.quizzes.find_one({"_id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.get("locked"):
        raise HTTPException(status_code=400, detail="Quiz is locked because active student attempts exist.")

    questions = quiz.get("questions", [])
    target_idx = next((i for i, item in enumerate(questions) if item["q_id"] == q_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail="Question not found")

    # Merge the partial patch onto the stored question
    patch = updated_q.model_dump(exclude_unset=True)
    merged = {**questions[target_idx], **{k: v for k, v in patch.items() if v is not None}}
    if patch.get("options") is not None and patch.get("correct_opt_id") not in {o["opt_id"] for o in merged["options"]}:
        merged["correct_opt_id"] = merged["options"][0]["opt_id"]

    questions[target_idx] = QuestionModel(**merged).model_dump()
    await db.quizzes.update_one({"_id": quiz_id}, {"$set": {"questions": questions}})
    return {"status": "updated", "q_id": q_id}

REGENERATE_SYSTEM_PROMPT = """You are an academic assessment author rewriting a single multiple choice question.
Rewrite the question so it tests the same fact from the source chunk but with fresh wording,
fresh distractors, and a different correct-answer position.
Output ONLY a JSON object in this exact shape:
{
  "question": "new question stem",
  "options": [
    {"opt_id": "opt_1", "text": "..."},
    {"opt_id": "opt_2", "text": "..."},
    {"opt_id": "opt_3", "text": "..."},
    {"opt_id": "opt_4", "text": "..."}
  ],
  "correct_opt_id": "opt_2",
  "explanation": "why the keyed option is correct, citing the notes",
  "difficulty": "easy" | "medium" | "hard",
  "topic": "topic name"
}
Rules: exactly 4 options, opt_id values opt_1..opt_4, difficulty one of easy/medium/hard,
and every claim must be supported by the source chunk."""

@router.post("/quizzes/{quiz_id}/questions/{q_id}/regenerate")
async def regenerate_question(
    quiz_id: str,
    q_id: str,
    current_user: dict = Depends(require_teacher),
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database offline")

    quiz = await db.quizzes.find_one({"_id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.get("locked"):
        raise HTTPException(status_code=400, detail="Quiz is locked because active student attempts exist.")

    questions = quiz.get("questions", [])
    target_idx = next((i for i, item in enumerate(questions) if item["q_id"] == q_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail="Question not found")

    existing = QuestionModel(**questions[target_idx])

    # Pull the grounded source text for this question
    source_chunks = await VectorRetriever.retrieve_top_k(
        classroom_id=quiz["classroom_id"],
        query=existing.question,
        top_k=3,
        doc_id=existing.source_refs[0].doc_id if existing.source_refs else None,
    )
    context_text = "\n\n".join(
        [f"[{c['filename']} - Page {c['page']}]:\n{c['text']}" for c in source_chunks[:3]]
    ) or existing.explanation

    payload = await LLM.complete_json(
        system=REGENERATE_SYSTEM_PROMPT,
        user=(
            f"Source chunk:\n{context_text}\n\n"
            f"Current question:\n{existing.model_dump_json()}\n\n"
            "Rewrite it now."
        ),
        temperature=0.6,
        max_tokens=1200,
    )

    if not isinstance(payload, dict) or not payload.get("question"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The LLM provider did not return a usable rewrite. Please try again.",
        )

    options_raw = payload.get("options") or []
    options = [
        QuizOption(opt_id=str(o.get("opt_id") or f"opt_{i + 1}"), text=str(o.get("text") or "").strip())
        for i, o in enumerate([x for x in options_raw if isinstance(x, dict)])
        if str(o.get("text") or "").strip()
    ]
    if len(options) < 2:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The LLM provider returned invalid options. Please try again.",
        )

    valid_ids = {o.opt_id for o in options}
    correct = str(payload.get("correct_opt_id") or "")
    if correct not in valid_ids:
        correct = options[0].opt_id

    diff_val = payload.get("difficulty", existing.difficulty)
    if diff_val not in ("easy", "medium", "hard"):
        diff_val = existing.difficulty

    rewritten = QuestionModel(
        q_id=existing.q_id,
        question=str(payload["question"]).strip(),
        options=options,
        correct_opt_id=correct,
        explanation=str(payload.get("explanation") or existing.explanation).strip(),
        difficulty=diff_val,
        topic=str(payload.get("topic") or existing.topic).strip(),
        source_chunk_ids=existing.source_chunk_ids,
        source_refs=existing.source_refs,
    )

    questions[target_idx] = rewritten.model_dump()
    await db.quizzes.update_one({"_id": quiz_id}, {"$set": {"questions": questions}})
    return {"status": "regenerated", "q_id": q_id, "question": rewritten.model_dump()}

@router.delete("/quizzes/{quiz_id}/questions/{q_id}")
async def delete_question(
    quiz_id: str,
    q_id: str,
    current_user: dict = Depends(require_teacher),
):
    db = get_database()
    if db is not None:
        quiz = await db.quizzes.find_one({"_id": quiz_id})
        if quiz:
            questions = [item for item in quiz.get("questions", []) if item["q_id"] != q_id]
            total_marks = len(questions) * 10
            await db.quizzes.update_one(
                {"_id": quiz_id},
                {"$set": {"questions": questions, "total_marks": total_marks}}
            )
    return {"status": "deleted", "q_id": q_id}

@router.post("/quizzes/{quiz_id}/publish")
async def publish_quiz(
    quiz_id: str,
    settings_req: QuizPublishRequest,
    current_user: dict = Depends(require_teacher),
):
    db = get_database()
    now_iso = datetime.now(timezone.utc).isoformat()
    if db is not None:
        quiz = await db.quizzes.find_one({"_id": quiz_id})
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        await db.quizzes.update_one(
            {"_id": quiz_id},
            {"$set": {
                "status": "published",
                "published_at": now_iso,
                "settings": settings_req.model_dump(),
            }}
        )

        # Log course announcement
        await db.activities.insert_one({
            "_id": f"act_{uuid.uuid4().hex[:8]}",
            "classroom_id": quiz["classroom_id"],
            "type": "quiz_published",
            "title": f"Assessment Published: {quiz['title']}",
            "detail": f"Time limit: {settings_req.duration_min}m • Deadline: {settings_req.deadline[:10]}",
            "actor": current_user["name"],
            "created_at": now_iso,
        })

    return {"status": "published", "quiz_id": quiz_id, "published_at": now_iso}
