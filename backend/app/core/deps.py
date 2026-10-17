from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_token
from app.core.database import get_database
from app.models.schemas import UserResponse

security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials missing or invalid header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token expired or signature invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload subject",
        )
    
    db = get_database()
    if db is not None:
        user = await db.users.find_one({"_id": user_id})
        if user:
            return {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "department": user.get("department"),
                "roll_no": user.get("roll_no"),
                "is_approved": user.get("is_approved", True),
                "created_at": user.get("created_at", ""),
            }

    # Fallback to token claims if database record query is in transient state
    return {
        "id": user_id,
        "name": payload.get("name", "Academic User"),
        "email": payload.get("email", ""),
        "role": payload.get("role", "student"),
        "department": payload.get("department"),
        "roll_no": payload.get("roll_no"),
        "is_approved": True,
        "created_at": payload.get("created_at", ""),
    }

async def require_teacher(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Academic security violation: Action restricted strictly to faculty (Teacher role required)",
        )
    return current_user

async def require_student(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action restricted strictly to enrolled students",
        )
    return current_user
