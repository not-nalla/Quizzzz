import uuid
import time
from datetime import datetime, timezone
from typing import Dict
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import ChatQueryRequest, ChatQueryResponse, ChatMessageModel
from app.core.config import settings
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.rag.chat_assistant import ChatAssistant

router = APIRouter(tags=["Classroom Doubt AI"])

# Simple sliding-window hourly quota per user (keyed on user id).
_rate_buckets: Dict[str, list] = {}


def _consume_quota(user_id: str) -> int:
    """Returns the number of questions remaining in the current hourly window."""
    now = time.time()
    window = _rate_buckets.setdefault(user_id, [])
    window[:] = [t for t in window if now - t < 3600]

    if len(window) >= settings.STUDENT_HOURLY_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Hourly doubt limit of {settings.STUDENT_HOURLY_RATE_LIMIT} questions reached. Try again later.",
        )
    window.append(now)
    return max(settings.STUDENT_HOURLY_RATE_LIMIT - len(window), 0)


@router.post("/classrooms/{classroom_id}/chat", response_model=ChatQueryResponse)
async def ask_doubt(
    classroom_id: str,
    req: ChatQueryRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    now_iso = datetime.now(timezone.utc).isoformat()

    remaining = _consume_quota(current_user["id"])

    # 1. Answer doubt via the LLM-grounded RAG assistant
    assistant_msg = await ChatAssistant.answer_doubt(
        classroom_id=classroom_id,
        query=req.message,
        history=req.history,
    )
    assistant_msg.created_at = now_iso

    # 2. Persist user and assistant messages
    if db is not None:
        await db.chat_history.insert_one({
            "_id": f"msg_{uuid.uuid4().hex[:12]}",
            "classroom_id": classroom_id,
            "user_id": current_user["id"],
            "role": "user",
            "content": req.message,
            "created_at": now_iso,
        })

        await db.chat_history.insert_one({
            "_id": assistant_msg.id,
            "classroom_id": classroom_id,
            "user_id": current_user["id"],
            "role": "assistant",
            "content": assistant_msg.content,
            "citations": [c.model_dump() for c in (assistant_msg.citations or [])],
            "refusal": assistant_msg.refusal,
            "created_at": now_iso,
        })

    return ChatQueryResponse(
        message=assistant_msg,
        remaining_hourly=remaining,
    )

@router.get("/classrooms/{classroom_id}/chat/messages")
async def get_chat_history(
    classroom_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    messages = []
    if db is not None:
        # Only this user's own conversation (each student has a private doubt thread)
        cursor = (
            db.chat_history.find({"classroom_id": classroom_id, "user_id": current_user["id"]})
            .sort("created_at", 1)
            .limit(50)
        )
        async for m in cursor:
            messages.append({
                "id": str(m["_id"]),
                "role": m["role"],
                "content": m["content"],
                "citations": m.get("citations"),
                "refusal": m.get("refusal", False),
                "createdAt": m["created_at"],
            })
    return messages
