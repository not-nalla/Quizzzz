from typing import Annotated, List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict, AliasChoices, model_validator
from datetime import datetime
import re

_camel_re = re.compile(r"(?<!^)(?=[A-Z])")

def _to_snake(key: str) -> str:
    return _camel_re.sub("_", key).lower()


class CamelTolerantModel(BaseModel):
    """Base model that accepts camelCase keys from the React client.

    FastAPI validates request bodies by field name, so ``validation_alias``
    alone is not enough; the keys are normalized before field validation runs.
    """
    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def _normalize_camel_keys(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        fields = cls.model_fields
        normalized = {}
        for key, value in data.items():
            if key in fields:
                normalized[key] = value
                continue
            snake = _to_snake(key)
            normalized[snake if snake in fields else key] = value
        return normalized


Role = Literal["teacher", "student"]
QuizStatus = Literal["draft", "published", "closed"]
Difficulty = Literal["easy", "medium", "hard"]
DocumentStatus = Literal["uploaded", "processing", "ready", "failed"]
AttemptStatus = Literal["in_progress", "submitted", "auto_submitted"]
ResultsVisibility = Literal["immediate", "after_deadline"]
ActivityType = Literal["announcement", "quiz_published", "document", "joined"]

# -----------------------------------------------------------------------------
# User Schemas
# -----------------------------------------------------------------------------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Role
    department: Optional[str] = None
    roll_no: Optional[str] = None

class UserRegisterRequest(UserBase):
    password: str
    invite_code: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[Role] = None

class UserResponse(UserBase):
    id: str
    is_approved: bool = True
    created_at: str

class AuthTokenResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class GoogleAuthRequest(BaseModel):
    id_token: str
    role: Optional[Role] = "student"
    invite_code: Optional[str] = None

# -----------------------------------------------------------------------------
# Classroom Schemas
# -----------------------------------------------------------------------------
class ClassroomCreateRequest(BaseModel):
    name: str
    subject: str
    semester: str
    batch: Optional[str] = None
    description: Optional[str] = None
    password: Optional[str] = None

class ClassroomJoinRequest(BaseModel):
    class_code: str
    password: Optional[str] = None

class ClassroomResponse(BaseModel):
    id: str
    name: str
    subject: str
    semester: str
    batch: Optional[str] = None
    description: Optional[str] = None
    teacher_id: str
    teacher_name: str
    class_code: str
    joining_enabled: bool = True
    chatbot_enabled: bool = True
    is_archived: bool = False
    created_at: str
    member_count: int = 1
    quiz_count: int = 0
    document_count: int = 0
    role: Role

class ClassroomMemberResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: Role
    roll_no: Optional[str] = None
    department: Optional[str] = None
    joined_at: str

class ActivityItemResponse(BaseModel):
    id: str
    type: ActivityType
    title: str
    detail: Optional[str] = None
    actor: str
    created_at: str

# -----------------------------------------------------------------------------
# Document & Chunk Schemas
# -----------------------------------------------------------------------------
class DocumentResponse(BaseModel):
    id: str
    classroom_id: str
    filename: str
    file_type: str
    unit: Optional[str] = None
    topic: Optional[str] = None
    status: DocumentStatus
    page_count: int = 0
    chunk_count: int = 0
    size_bytes: int = 0
    created_at: str

class ChunkResponse(BaseModel):
    id: str
    doc_id: str
    classroom_id: str
    text: str
    token_count: int
    page: int
    unit: Optional[str] = None
    topic: Optional[str] = None

# -----------------------------------------------------------------------------
# Quiz Schemas
# -----------------------------------------------------------------------------
class QuizOption(CamelTolerantModel):
    opt_id: Annotated[str, AliasChoices("opt_id", "optId")]
    text: str

class SourceRef(BaseModel):
    doc_id: str
    filename: str
    page: int

class QuestionModel(BaseModel):
    q_id: str
    question: str
    options: List[QuizOption]
    correct_opt_id: str
    explanation: str
    difficulty: Difficulty
    topic: str
    source_chunk_ids: List[str] = []
    source_refs: List[SourceRef] = []

class StudentQuestionModel(BaseModel):
    q_id: str
    question: str
    options: List[QuizOption]
    difficulty: Difficulty
    topic: str

class QuizSettingsModel(CamelTolerantModel):
    start_at: str
    deadline: str
    duration_min: int = 25
    attempts_allowed: int = 1
    shuffle_questions: bool = True
    shuffle_options: bool = True
    show_results: ResultsVisibility = "immediate"

class QuizCreateRequest(CamelTolerantModel):
    classroom_id: Annotated[str, AliasChoices("classroom_id", "classroomId")]
    title: str
    count: int = 10
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"
    unit: Annotated[Optional[str], AliasChoices("unit")] = None
    doc_id: Annotated[Optional[str], AliasChoices("doc_id", "docId")] = None

class QuestionUpdateRequest(CamelTolerantModel):
    """Partial patch for a draft question (all fields optional, snake_case or camelCase)."""
    question: Annotated[Optional[str], AliasChoices("question")] = None
    options: Annotated[Optional[List[QuizOption]], AliasChoices("options")] = None
    correct_opt_id: Annotated[Optional[str], AliasChoices("correct_opt_id", "correctOptId")] = None
    explanation: Annotated[Optional[str], AliasChoices("explanation")] = None
    difficulty: Annotated[Optional[Difficulty], AliasChoices("difficulty")] = None
    topic: Annotated[Optional[str], AliasChoices("topic")] = None

class QuizPublishRequest(CamelTolerantModel):
    """Publish payload. Accepts both snake_case and camelCase keys from the web client."""
    start_at: Annotated[str, AliasChoices("start_at", "startAt")]
    deadline: Annotated[str, AliasChoices("deadline")]
    duration_min: Annotated[int, AliasChoices("duration_min", "durationMin")] = 25
    attempts_allowed: Annotated[int, AliasChoices("attempts_allowed", "attemptsAllowed")] = 1
    shuffle_questions: Annotated[bool, AliasChoices("shuffle_questions", "shuffleQuestions")] = True
    shuffle_options: Annotated[bool, AliasChoices("shuffle_options", "shuffleOptions")] = True
    show_results: Annotated[ResultsVisibility, AliasChoices("show_results", "showResults")] = "immediate"

class QuizResponse(BaseModel):
    id: str
    classroom_id: str
    classroom_name: str
    title: str
    status: QuizStatus
    total_marks: int
    questions: List[QuestionModel]
    settings: QuizSettingsModel
    created_at: str
    published_at: Optional[str] = None
    attempt_count: int = 0
    locked: bool = False

class StudentQuizResponse(BaseModel):
    id: str
    classroom_id: str
    classroom_name: str
    title: str
    status: QuizStatus
    total_marks: int
    question_count: int
    settings: QuizSettingsModel
    created_at: str
    published_at: Optional[str] = None
    attempts_used: int = 0
    attempts_allowed: int = 1
    best_score: Optional[float] = None
    availability: Literal["not_open", "open", "closed", "expired"] = "open"

# -----------------------------------------------------------------------------
# Attempt Schemas
# -----------------------------------------------------------------------------
class AttemptAnswerInput(BaseModel):
    q_id: str
    selected_opt_id: str

class AttemptAnswerModel(AttemptAnswerInput):
    answered_at: str

class AttemptResponse(BaseModel):
    id: str
    quiz_id: str
    classroom_id: str
    student_id: str
    student_name: Optional[str] = None
    attempt_no: int
    started_at: str
    expires_at: str
    submitted_at: Optional[str] = None
    answers: List[AttemptAnswerModel] = []
    score: Optional[float] = None
    total: int
    percentage: Optional[float] = None
    tab_switch_count: int = 0
    status: AttemptStatus

class AnswerReviewModel(BaseModel):
    q_id: str
    question: str
    options: List[QuizOption]
    selected_opt_id: Optional[str] = None
    correct_opt_id: str
    explanation: str
    topic: str
    difficulty: Difficulty
    source_refs: List[SourceRef] = []

class AttemptResultPayload(BaseModel):
    attempt: AttemptResponse
    reviews: List[AnswerReviewModel] = []
    results_visible: bool = True

# -----------------------------------------------------------------------------
# Doubt Assistant (RAG Chat) Schemas
# -----------------------------------------------------------------------------
class CitationModel(BaseModel):
    doc_id: str
    filename: str
    page: int
    text: str
    score: float

class ChatMessageModel(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    citations: Optional[List[CitationModel]] = None
    refusal: bool = False
    created_at: str

class ChatQueryRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

class ChatQueryResponse(BaseModel):
    message: ChatMessageModel
    remaining_hourly: int = 28

# -----------------------------------------------------------------------------
# Analytics Schemas
# -----------------------------------------------------------------------------
class DistributionBucket(BaseModel):
    label: str
    count: int

class QuestionAccuracyMetric(BaseModel):
    q_id: str
    question: str
    difficulty: Difficulty
    correct_rate: float
    attempts: int

class StudentSubmissionResult(BaseModel):
    student_name: str
    roll_no: Optional[str] = None
    quiz_title: str
    score: float
    total: int
    percentage: float
    submitted_at: str

class ClassAnalyticsResponse(BaseModel):
    classroom_id: str
    total_students: int
    total_attempts: int
    average_score: float
    participation_rate: float
    quizzes_published: int
    documents_ready: int
    distribution: List[DistributionBucket]
    question_accuracy: List[QuestionAccuracyMetric]
    recent_results: List[StudentSubmissionResult]
