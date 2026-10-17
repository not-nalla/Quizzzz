import uuid
import random
import string
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import (
    ClassroomCreateRequest,
    ClassroomJoinRequest,
    ClassroomResponse,
    ClassroomMemberResponse,
    ActivityItemResponse,
)
from app.core.database import get_database
from app.core.deps import get_current_user, require_teacher

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])

def generate_class_code(subject: str) -> str:
    prefix = "".join([c for c in subject if c.isalnum()][:4]).upper() or "CS"
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{suffix}"

@router.post("", response_model=ClassroomResponse)
async def create_classroom(
    req: ClassroomCreateRequest,
    current_user: dict = Depends(require_teacher),
):
    db = get_database()
    classroom_id = f"cls_{uuid.uuid4().hex[:12]}"
    class_code = generate_class_code(req.subject)
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": classroom_id,
        "name": req.name,
        "subject": req.subject,
        "semester": req.semester,
        "batch": req.batch or "Batch 2026",
        "description": req.description,
        "teacher_id": current_user["id"],
        "teacher_name": current_user["name"],
        "class_code": class_code,
        "password": req.password,
        "joining_enabled": True,
        "chatbot_enabled": True,
        "is_archived": False,
        "created_at": now_iso,
        "member_ids": [current_user["id"]],
    }

    if db is not None:
        await db.classrooms.insert_one(doc)

        # Log activity
        await db.activities.insert_one({
            "_id": f"act_{uuid.uuid4().hex[:8]}",
            "classroom_id": classroom_id,
            "type": "announcement",
            "title": f"Welcome to {req.name}",
            "detail": "Course established with syllabus-grounded assessment and AI doubt support.",
            "actor": current_user["name"],
            "created_at": now_iso,
        })

    return ClassroomResponse(
        id=classroom_id,
        name=req.name,
        subject=req.subject,
        semester=req.semester,
        batch=req.batch,
        description=req.description,
        teacher_id=current_user["id"],
        teacher_name=current_user["name"],
        class_code=class_code,
        joining_enabled=True,
        chatbot_enabled=True,
        is_archived=False,
        created_at=now_iso,
        member_count=1,
        quiz_count=0,
        document_count=0,
        role="teacher",
    )

@router.get("", response_model=List[ClassroomResponse])
async def list_classrooms(current_user: dict = Depends(get_current_user)):
    db = get_database()
    result = []

    if db is not None:
        user_id = current_user["id"]
        # If teacher, find classrooms where teacher_id == user_id
        # If student, find classrooms where member_ids contains user_id
        if current_user["role"] == "teacher":
            cursor = db.classrooms.find({"teacher_id": user_id})
        else:
            cursor = db.classrooms.find({"member_ids": user_id})

        classes = await cursor.to_list(length=100)

        for c in classes:
            c_id = str(c["_id"])
            doc_count = await db.documents.count_documents({"classroom_id": c_id})
            quiz_count = await db.quizzes.count_documents({"classroom_id": c_id})
            member_count = len(c.get("member_ids", [])) or 1

            result.append(ClassroomResponse(
                id=c_id,
                name=c["name"],
                subject=c["subject"],
                semester=c["semester"],
                batch=c.get("batch"),
                description=c.get("description"),
                teacher_id=c["teacher_id"],
                teacher_name=c["teacher_name"],
                class_code=c["class_code"],
                joining_enabled=c.get("joining_enabled", True),
                chatbot_enabled=c.get("chatbot_enabled", True),
                is_archived=c.get("is_archived", False),
                created_at=c.get("created_at", ""),
                member_count=member_count,
                quiz_count=quiz_count,
                document_count=doc_count,
                role=current_user["role"],
            ))

    # No seeded classrooms: the client renders its own empty state so the
    # teacher can create the first course and the student can join with a code.
    return result

@router.get("/{classroom_id}", response_model=ClassroomResponse)
async def get_classroom(classroom_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is not None:
        c = await db.classrooms.find_one({"_id": classroom_id})
        if c:
            c_id = str(c["_id"])
            doc_count = await db.documents.count_documents({"classroom_id": c_id})
            quiz_count = await db.quizzes.count_documents({"classroom_id": c_id})
            member_count = len(c.get("member_ids", [])) or 1
            return ClassroomResponse(
                id=c_id,
                name=c["name"],
                subject=c["subject"],
                semester=c["semester"],
                batch=c.get("batch"),
                description=c.get("description"),
                teacher_id=c["teacher_id"],
                teacher_name=c["teacher_name"],
                class_code=c["class_code"],
                joining_enabled=c.get("joining_enabled", True),
                chatbot_enabled=c.get("chatbot_enabled", True),
                is_archived=c.get("is_archived", False),
                created_at=c.get("created_at", ""),
                member_count=member_count,
                quiz_count=quiz_count,
                document_count=doc_count,
                role=current_user["role"],
            )

    raise HTTPException(status_code=404, detail="Classroom not found")

@router.post("/join", response_model=ClassroomResponse)
async def join_classroom(req: ClassroomJoinRequest, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is not None:
        c = await db.classrooms.find_one({"class_code": req.class_code.strip().upper()})
        if not c:
            raise HTTPException(status_code=404, detail="Invalid classroom code. Check code with instructor.")

        c_id = str(c["_id"])
        if not c.get("joining_enabled", True):
            raise HTTPException(status_code=403, detail="Joining is currently disabled for this classroom.")

        member_ids = c.get("member_ids", [])
        if current_user["id"] not in member_ids:
            await db.classrooms.update_one({"_id": c_id}, {"$push": {"member_ids": current_user["id"]}})
            member_ids = [*member_ids, current_user["id"]]

        doc_count = await db.documents.count_documents({"classroom_id": c_id})
        quiz_count = await db.quizzes.count_documents({"classroom_id": c_id})

        return ClassroomResponse(
            id=c_id,
            name=c["name"],
            subject=c["subject"],
            semester=c["semester"],
            batch=c.get("batch"),
            description=c.get("description"),
            teacher_id=c["teacher_id"],
            teacher_name=c["teacher_name"],
            class_code=c["class_code"],
            joining_enabled=c.get("joining_enabled", True),
            chatbot_enabled=c.get("chatbot_enabled", True),
            is_archived=c.get("is_archived", False),
            created_at=c.get("created_at", ""),
            member_count=len(member_ids),
            quiz_count=quiz_count,
            document_count=doc_count,
            role="student",
        )

    raise HTTPException(status_code=404, detail="Classroom not found")

@router.get("/{classroom_id}/members", response_model=List[ClassroomMemberResponse])
async def list_members(classroom_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    members = []
    if db is not None:
        c = await db.classrooms.find_one({"_id": classroom_id})
        if c:
            member_ids = c.get("member_ids", [])
            cursor = db.users.find({"_id": {"$in": member_ids}})
            async for u in cursor:
                members.append(ClassroomMemberResponse(
                    user_id=str(u["_id"]),
                    name=u["name"],
                    email=u["email"],
                    role=u["role"],
                    roll_no=u.get("roll_no"),
                    department=u.get("department"),
                    joined_at=u.get("created_at", ""),
                ))
    return members

@router.delete("/{classroom_id}/members/{user_id}")
async def evict_member(
    classroom_id: str,
    user_id: str,
    current_user: dict = Depends(require_teacher),
):
    db = get_database()
    if db is not None:
        await db.classrooms.update_one({"_id": classroom_id}, {"$pull": {"member_ids": user_id}})
    return {"status": "evicted", "user_id": user_id}

@router.get("/{classroom_id}/feed", response_model=List[ActivityItemResponse])
async def get_classroom_feed(classroom_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    feed = []
    if db is not None:
        cursor = db.activities.find({"classroom_id": classroom_id}).sort("created_at", -1)
        async for act in cursor:
            feed.append(ActivityItemResponse(
                id=str(act["_id"]),
                type=act["type"],
                title=act["title"],
                detail=act.get("detail"),
                actor=act["actor"],
                created_at=act["created_at"],
            ))
    if not feed:
        feed.append(ActivityItemResponse(
            id="act_welcome",
            type="announcement",
            title="Classroom Initialized",
            detail="Upload syllabus lecture notes (PDF, DOCX, PPTX) to start RAG assessment generation.",
            actor="Faculty Administration",
            created_at=datetime.now(timezone.utc).isoformat(),
        ))
    return feed
