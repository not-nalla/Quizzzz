import io
import csv
from typing import Dict, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.models.schemas import (
    ClassAnalyticsResponse,
    DistributionBucket,
    QuestionAccuracyMetric,
    StudentSubmissionResult,
)
from app.core.database import get_database
from app.core.deps import get_current_user

router = APIRouter(tags=["Analytics & Gradebook"])

DISTRIBUTION_LABELS = ["90-100%", "80-89%", "70-79%", "60-69%", "<60%"]


def _bucket_index(percentage: float) -> int:
    if percentage >= 90:
        return 0
    if percentage >= 80:
        return 1
    if percentage >= 70:
        return 2
    if percentage >= 60:
        return 3
    return 4


async def _collect_attempts(db, classroom_id: str) -> List[dict]:
    cursor = db.attempts.find({"classroom_id": classroom_id, "status": {"$in": ["submitted", "auto_submitted"]}})
    attempts = await cursor.to_list(length=1000)
    attempts.sort(key=lambda a: a.get("submitted_at") or "", reverse=True)
    return attempts


async def _quiz_titles(db, classroom_id: str) -> Dict[str, str]:
    titles: Dict[str, str] = {}
    cursor = db.quizzes.find({"classroom_id": classroom_id})
    async for q in cursor:
        titles[str(q["_id"])] = q.get("title", "Assessment")
    return titles


@router.get("/classrooms/{classroom_id}/analytics", response_model=ClassAnalyticsResponse)
async def get_classroom_analytics(
    classroom_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database offline")

    classroom = await db.classrooms.find_one({"_id": classroom_id})
    enrolled_ids = list(classroom.get("member_ids", [])) if classroom else []

    attempts = await _collect_attempts(db, classroom_id)
    attempt_student_ids = {a.get("student_id") for a in attempts if a.get("student_id")}

    total_students = max(len(set(enrolled_ids) | attempt_student_ids), len(enrolled_ids), 0)
    total_attempts = len(attempts)
    scores = [float(a.get("percentage") or 0) for a in attempts]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    docs_count = await db.documents.count_documents({"classroom_id": classroom_id, "status": "ready"})
    quiz_count = await db.quizzes.count_documents({"classroom_id": classroom_id, "status": "published"})

    # Score distribution over real submitted attempts
    buckets = [0] * len(DISTRIBUTION_LABELS)
    for s in scores:
        buckets[_bucket_index(s)] += 1
    distribution = [
        DistributionBucket(label=label, count=count)
        for label, count in zip(DISTRIBUTION_LABELS, buckets)
    ]

    # Question accuracy computed from every graded answer in this classroom
    titles = await _quiz_titles(db, classroom_id)
    stats: Dict[str, Dict[str, object]] = {}
    for a in attempts:
        quiz_id = a.get("quiz_id")
        quiz_doc = await db.quizzes.find_one({"_id": quiz_id}) if quiz_id else None
        if not quiz_doc:
            continue
        answer_map = {ans.get("q_id"): ans.get("selected_opt_id") for ans in a.get("answers", [])}
        for q in quiz_doc.get("questions", []):
            q_id = q.get("q_id")
            if not q_id or q_id not in answer_map:
                continue
            entry = stats.setdefault(q_id, {
                "question": q.get("question", ""),
                "difficulty": q.get("difficulty", "medium"),
                "attempts": 0,
                "correct": 0,
            })
            entry["attempts"] = int(entry["attempts"]) + 1
            if answer_map[q_id] == q.get("correct_opt_id"):
                entry["correct"] = int(entry["correct"]) + 1

    question_accuracy = sorted(
        [
            QuestionAccuracyMetric(
                q_id=q_id,
                question=str(entry["question"])[:220],
                difficulty=entry["difficulty"],  # type: ignore[arg-type]
                correct_rate=round((int(entry["correct"]) / max(int(entry["attempts"]), 1)) * 100, 1),
                attempts=int(entry["attempts"]),
            )
            for q_id, entry in stats.items()
        ],
        key=lambda m: m.attempts,
        reverse=True,
    )[:10]

    # Recent graded submissions
    recent_results: List[StudentSubmissionResult] = []
    for a in attempts[:10]:
        student_id = a.get("student_id")
        roll_no = a.get("roll_no")
        if roll_no is None and student_id:
            user = await db.users.find_one({"_id": student_id})
            roll_no = (user or {}).get("roll_no")
        recent_results.append(
            StudentSubmissionResult(
                student_name=a.get("student_name") or "Student",
                roll_no=roll_no,
                quiz_title=titles.get(str(a.get("quiz_id")), "Assessment"),
                score=float(a.get("score") or 0),
                total=int(a.get("total") or 0),
                percentage=float(a.get("percentage") or 0),
                submitted_at=a.get("submitted_at") or "",
            )
        )

    participation_rate = (
        round((total_attempts / max(total_students, 1)) * 100, 1) if total_students else 0.0
    )

    return ClassAnalyticsResponse(
        classroom_id=classroom_id,
        total_students=total_students,
        total_attempts=total_attempts,
        average_score=avg_score,
        participation_rate=participation_rate,
        quizzes_published=quiz_count,
        documents_ready=docs_count,
        distribution=distribution,
        question_accuracy=question_accuracy,
        recent_results=recent_results,
    )

@router.get("/classrooms/{classroom_id}/analytics/export-csv")
async def export_gradebook_csv(
    classroom_id: str,
    current_user: dict = Depends(get_current_user),
):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Name", "Roll No", "Assessment Title", "Score", "Total", "Percentage", "Submitted At"])

    db = get_database()
    if db is not None:
        titles = await _quiz_titles(db, classroom_id)
        for a in await _collect_attempts(db, classroom_id):
            roll_no = a.get("roll_no")
            if roll_no is None and a.get("student_id"):
                user = await db.users.find_one({"_id": a.get("student_id")})
                roll_no = (user or {}).get("roll_no")
            writer.writerow([
                a.get("student_name") or "Student",
                roll_no or "",
                titles.get(str(a.get("quiz_id")), "Assessment"),
                a.get("score", 0),
                a.get("total", 0),
                f"{a.get('percentage', 0)}%",
                a.get("submitted_at", ""),
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Gradebook_{classroom_id}.csv"},
    )
