import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
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


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    try:
        dt = datetime.fromisoformat(value)  # type: ignore[arg-type]
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (TypeError, ValueError):
        return None


def _attempt_owner_only(attempt: dict, current_user: dict) -> None:
    if str(attempt.get("student_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="You may only work on your own attempt.")


def _has_expired(attempt: dict) -> bool:
    expires_at = _parse_iso(attempt.get("expires_at"))
    if expires_at is None:
        return False
    return datetime.now(timezone.utc) > expires_at


def _grade_attempt(attempt: dict, quiz: dict) -> Tuple[float, float]:
    """Server-authoritative grading shared by submit and timeout finalization."""
    questions = quiz.get("questions", [])
    answer_map = {a["q_id"]: a["selected_opt_id"] for a in attempt.get("answers", [])}
    correct_count = sum(
        1 for q in questions if answer_map.get(q.get("q_id")) == q.get("correct_opt_id")
    )
    total_marks = quiz.get("total_marks", 0)
    marks_per_q = total_marks / max(len(questions), 1)
    score = round(correct_count * marks_per_q, 1)
    percentage = round((score / max(total_marks, 1)) * 100, 1)
    return score, percentage


def _build_reviews(attempt: dict, quiz: dict) -> List[AnswerReviewModel]:
    answer_map = {a["q_id"]: a["selected_opt_id"] for a in attempt.get("answers", [])}
    reviews: List[AnswerReviewModel] = []
    for q in quiz.get("questions", []):
        reviews.append(
            AnswerReviewModel(
                q_id=q["q_id"],
                question=q["question"],
                options=q["options"],
                selected_opt_id=answer_map.get(q["q_id"]),
                correct_opt_id=q["correct_opt_id"],
                explanation=q.get("explanation", ""),
                topic=q.get("topic", "Topic"),
                difficulty=q.get("difficulty", "medium"),
                source_refs=q.get("source_refs", []),
            )
        )
    return reviews


def _to_attempt_response(attempt: dict) -> AttemptResponse:
    return AttemptResponse(
        id=str(attempt["_id"]),
        quiz_id=attempt["quiz_id"],
        classroom_id=attempt["classroom_id"],
        student_id=attempt["student_id"],
        student_name=attempt.get("student_name"),
        attempt_no=attempt.get("attempt_no", 1),
        started_at=attempt["started_at"],
        expires_at=attempt["expires_at"],
        submitted_at=attempt.get("submitted_at"),
        answers=attempt.get("answers", []),
        score=attempt.get("score"),
        total=attempt.get("total", 0),
        percentage=attempt.get("percentage"),
        tab_switch_count=attempt.get("tab_switch_count", 0),
        status=attempt.get("status", "in_progress"),
    )


async def _finalize_attempt(db, attempt: dict, quiz: dict, status_value: str) -> dict:
    score, percentage = _grade_attempt(attempt, quiz)
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.attempts.update_one(
        {"_id": attempt["_id"]},
        {"$set": {
            "submitted_at": now_iso,
            "score": score,
            "percentage": percentage,
            "status": status_value,
        }},
    )
    attempt = {**attempt, "submitted_at": now_iso, "score": score, "percentage": percentage, "status": status_value}
    return attempt


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

    now = datetime.now(timezone.utc)
    quiz_settings = quiz.get("settings", {})
    start_at = _parse_iso(quiz_settings.get("start_at"))
    deadline = _parse_iso(quiz_settings.get("deadline"))

    # Resume or finalize any lingering in-progress attempt (refresh-safe, zero-trust)
    in_progress = await db.attempts.find_one(
        {"quiz_id": quiz_id, "student_id": current_user["id"], "status": "in_progress"},
        sort=[("started_at", -1)],
    )
    if in_progress:
        within_window = (
            (_has_expired(in_progress) is False)
            and (start_at is None or now >= start_at)
            and (deadline is None or now <= deadline)
        )
        if within_window:
            return _to_attempt_response(in_progress)
        # Timer expired or deadline passed: finalize server-side so it is graded, not stuck
        await _finalize_attempt(db, in_progress, quiz, "auto_submitted")

    # Window enforcement (PRD ATT-1): the server, not the client, gates the window
    if start_at is not None and now < start_at:
        raise HTTPException(status_code=400, detail="This assessment has not opened yet.")
    if deadline is not None and now > deadline:
        raise HTTPException(status_code=400, detail="The deadline for this assessment has passed.")

    # Check attempt limits
    existing_attempts = await db.attempts.count_documents({
        "quiz_id": quiz_id,
        "student_id": current_user["id"],
    })
    allowed = quiz_settings.get("attempts_allowed", 1)
    if existing_attempts >= allowed:
        raise HTTPException(status_code=400, detail=f"Maximum attempt allowance ({allowed}) reached for this exam.")

    attempt_id = f"att_{uuid.uuid4().hex[:12]}"
    duration_min = quiz_settings.get("duration_min", 25)
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

    return _to_attempt_response(attempt_doc)


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

    reviews = _build_reviews(attempt, quiz)
    score, percentage = _grade_attempt(attempt, quiz)
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
