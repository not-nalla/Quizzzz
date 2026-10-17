import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import (
    AttemptResponse,
    AttemptAnswerInput,
    AttemptResultPayload,
    AnswerReviewModel,
    SourceRef,
)
from app.core.database import get_database
from app.core.deps import get_current_user

router = APIRouter(tags=["Assessment Execution"])

@router.post("/quizzes/{quiz_id}/attempts/start", response_model=AttemptResponse)
async def start_attempt(quiz_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database offline")

    quiz = await db.quizzes.find_one({"_id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if quiz["status"] != "published":
        raise HTTPException(status_code=400, detail="Assessment is not currently open for student attempts.")

    # Check attempt limits
    existing_attempts = await db.attempts.count_documents({
        "quiz_id": quiz_id,
        "student_id": current_user["id"],
    })
    allowed = quiz["settings"].get("attempts_allowed", 1)
    if existing_attempts >= allowed:
        raise HTTPException(status_code=400, detail=f"Maximum attempt allowance ({allowed}) reached for this exam.")

    attempt_id = f"att_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    duration_min = quiz["settings"].get("duration_min", 25)
    expires_at = now + timedelta(minutes=duration_min)

    attempt_doc = {
        "_id": attempt_id,
        "quiz_id": quiz_id,
        "classroom_id": quiz["classroom_id"],
        "student_id": current_user["id"],
        "student_name": current_user["name"],
        "attempt_no": existing_attempts + 1,
        "started_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "submitted_at": None,
        "answers": [],
        "score": None,
        "total": quiz["total_marks"],
        "percentage": None,
        "tab_switch_count": 0,
        "status": "in_progress",
    }

    await db.attempts.insert_one(attempt_doc)
    # Lock quiz questions from modification (QZ-5)
    await db.quizzes.update_one({"_id": quiz_id}, {"$set": {"locked": True}})

    return AttemptResponse(
        id=attempt_id,
        quiz_id=quiz_id,
        classroom_id=quiz["classroom_id"],
        student_id=current_user["id"],
        student_name=current_user["name"],
        attempt_no=existing_attempts + 1,
        started_at=now.isoformat(),
        expires_at=expires_at.isoformat(),
        answers=[],
        total=quiz["total_marks"],
        tab_switch_count=0,
        status="in_progress",
    )

def _attempt_owner_only(attempt: dict, current_user: dict) -> None:
    if str(attempt.get("student_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="You may only work on your own attempt.")


def _has_expired(attempt: dict) -> bool:
    try:
        expires_at = datetime.fromisoformat(attempt["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > expires_at
    except (KeyError, ValueError, TypeError):
        return False


@router.post("/attempts/{attempt_id}/autosave")
async def autosave_answer(
    attempt_id: str,
    answer_in: AttemptAnswerInput,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    now_iso = datetime.now(timezone.utc).isoformat()
    if db is None:
        raise HTTPException(status_code=500, detail="Database offline")

    attempt = await db.attempts.find_one({"_id": attempt_id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    _attempt_owner_only(attempt, current_user)
    if attempt["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Cannot save answers to submitted attempt")
    if _has_expired(attempt):
        raise HTTPException(status_code=400, detail="The server timer for this attempt has expired.")

    answers = attempt.get("answers", [])
    # Replace or append
    existing_idx = next((i for i, a in enumerate(answers) if a["q_id"] == answer_in.q_id), None)
    answer_record = {
        "q_id": answer_in.q_id,
        "selected_opt_id": answer_in.selected_opt_id,
        "answered_at": now_iso,
    }

    if existing_idx is not None:
        answers[existing_idx] = answer_record
    else:
        answers.append(answer_record)

    await db.attempts.update_one({"_id": attempt_id}, {"$set": {"answers": answers}})

    return {"status": "saved", "saved_at": now_iso}

@router.post("/attempts/{attempt_id}/telemetry")
async def record_telemetry(
    attempt_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database offline")
    attempt = await db.attempts.find_one({"_id": attempt_id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    _attempt_owner_only(attempt, current_user)

    await db.attempts.update_one(
        {"_id": attempt_id},
        {"$inc": {"tab_switch_count": 1}}
    )
    return {"status": "logged"}

@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResultPayload)
async def submit_attempt(
    attempt_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database offline")

    attempt = await db.attempts.find_one({"_id": attempt_id})
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    _attempt_owner_only(attempt, current_user)

    if attempt["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="This attempt has already been submitted.")

    quiz = await db.quizzes.find_one({"_id": attempt["quiz_id"]})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = quiz.get("questions", [])
    student_answers = attempt.get("answers", [])
    answer_map = {a["q_id"]: a["selected_opt_id"] for a in student_answers}

    correct_count = 0
    reviews: List[AnswerReviewModel] = []

    for q in questions:
        q_id = q["q_id"]
        selected = answer_map.get(q_id)
        is_correct = selected == q["correct_opt_id"]
        if is_correct:
            correct_count += 1

        reviews.append(AnswerReviewModel(
            q_id=q_id,
            question=q["question"],
            options=q["options"],
            selected_opt_id=selected,
            correct_opt_id=q["correct_opt_id"],
            explanation=q["explanation"],
            topic=q.get("topic", "Topic"),
            difficulty=q.get("difficulty", "medium"),
            source_refs=q.get("source_refs", []),
        ))

    marks_per_q = quiz["total_marks"] / max(len(questions), 1)
    score = round(correct_count * marks_per_q, 1)
    percentage = round((score / max(quiz["total_marks"], 1)) * 100, 1)
    now_iso = datetime.now(timezone.utc).isoformat()
    final_status = "auto_submitted" if _has_expired(attempt) else "submitted"

    await db.attempts.update_one(
        {"_id": attempt_id},
        {"$set": {
            "submitted_at": now_iso,
            "score": score,
            "percentage": percentage,
            "status": final_status,
        }}
    )

    attempt_res = AttemptResponse(
        id=attempt_id,
        quiz_id=attempt["quiz_id"],
        classroom_id=attempt["classroom_id"],
        student_id=attempt["student_id"],
        student_name=attempt.get("student_name"),
        attempt_no=attempt["attempt_no"],
        started_at=attempt["started_at"],
        expires_at=attempt["expires_at"],
        submitted_at=now_iso,
        answers=attempt.get("answers", []),
        score=score,
        total=quiz["total_marks"],
        percentage=percentage,
        tab_switch_count=attempt.get("tab_switch_count", 0),
        status=final_status,
    )

    show_results_imm = quiz["settings"].get("show_results") == "immediate"

    return AttemptResultPayload(
        attempt=attempt_res,
        reviews=reviews if show_results_imm else [],
        results_visible=show_results_imm,
    )
