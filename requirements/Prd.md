# Product Requirements Document (PRD): SyllabusIQ

**Version:** 1.0  
**Status:** Ready for Development  
**Product Name:** SyllabusIQ  

---

## 1. Executive Summary & Vision
SyllabusIQ is an academic assessment and classroom management platform tailored for colleges and higher education institutions. Faculty members upload syllabus documents, lecture notes, and slide decks to auto-generate syllabus-aligned quizzes using Retrieval-Augmented Generation (RAG). Students enroll via classroom credentials, take server-synchronized timed tests in a clean interface, view detailed analytics, and resolve course doubts with an AI assistant strictly scoped to the uploaded course notes.

---

## 2. Core Problem & Value Proposition
* **Faculty Burden:** Teachers spend hours authoring, formatting, and balancing syllabus-accurate quizzes every semester.
* **Generic AI Hallucinations:** Off-the-shelf AI models invent facts and reference topics outside the syllabus.
* **Disconnected LMS Tools:** Standard platforms (e.g., standard Google Classroom setups) lack integrated question generation from notes and direct doubt resolution against course materials.
* **Guaranteed Alignment:** SyllabusIQ restricts generation and answers strictly to verified source chunks from uploaded files.

---

## 3. Product Scope

### In-Scope (MVP / v1.0)
* Role-based access control (`teacher` vs. `student`) with institutional invite verification.
* Classroom lifecycle: creation, roster administration, student enrollment via class code and password, and activity feeds.
* Document ingestion: multi-format parsing (PDF, DOCX, PPTX, TXT), semantic chunking, and vector indexing.
* Grounded quiz generation: strict JSON schemas, automated Pydantic verification, and a draft revision workbench.
* Secure quiz runner: server-authoritative timer, option ID hashing, periodic state autosave, and tab-switch telemetry.
* Classroom RAG doubt assistant: similarity threshold gating and source document/page citations.
* Analytics: score distribution, question accuracy metrics, and CSV/Excel roster exports.

### Out-of-Scope (v1.0)
* WebRTC live lectures and video streaming.
* Payment processing and subscription billing.
* Native mobile applications (responsive web only).
* Hardware proctoring (webcam recording, microphone analysis, or eye-tracking).
* Complex file-submission assignments and manual peer-grading workflows (slated for v2.0).

---

## 4. User Personas & Permissions

| Capability | Teacher | Student |
| :--- | :--- | :--- |
| **Registration** | Requires institutional invite code | Standard student registration |
| **Create Classroom** | Allowed | Denied |
| **Join Classroom** | Denied (Owner only) | Allowed (Code + Password) |
| **Upload / Delete Notes** | Allowed (Owned classrooms) | Denied |
| **Generate & Edit Quizzes** | Allowed | Denied |
| **Attempt Quizzes** | Preview only | Allowed (Enrolled only) |
| **View Answer Keys** | Unrestricted | Post-deadline / Teacher setting |
| **Classroom Doubts Chatbot** | Verification mode | Allowed (Enrolled only) |

*Security Rule:* All `/api/v1/classrooms/{id}/*` endpoints enforce backend role and membership validation. Client-provided roles are never trusted.

---

## 5. Functional Requirements

### 5.1 Authentication & Authorization
* `AUTH-1` [P0]: Email and password registration with explicit role selection (`teacher` | `student`).
* `AUTH-2` [P0]: Dual-token authentication (short-lived JWT access token + HTTP-only refresh token).
* `AUTH-3` [P0]: Passwords hashed using Argon2id or bcrypt (minimum 12 rounds).
* `AUTH-4` [P0]: Teacher registration requires a valid institutional invite code.
* `AUTH-5` [P1]: Self-serve password reset via cryptographically signed one-time email tokens.
* `AUTH-6` [P1]: Profile customization (display name, department, roll number).

### 5.2 Classroom Administration
* `CLS-1` [P0]: Classroom creation with metadata: Name, Subject, Semester, Batch, Description.
* `CLS-2` [P0]: Unique `class_code` generation and editable classroom password (stored hashed).
* `CLS-3` [P0]: Student join flow rate-limited to 5 attempts per 10 minutes.
* `CLS-4` [P0]: Faculty roster controls: member eviction, enrollment toggle, archival state.
* `CLS-5` [P0]: Reverse-chronological activity feed showing announcements and quizzes.
* `CLS-6` [P1]: Voluntary student self-unenrollment.

### 5.3 Knowledge Base & Ingestion
* `DOC-1` [P0]: Document upload supporting PDF, DOCX, PPTX, and TXT formats up to 20MB.
* `DOC-2` [P0]: Optional tagging of documents by Unit and Topic.
* `DOC-3` [P0]: Asynchronous processing pipeline: extraction → cleaning → chunking (500–800 tokens, 100-token overlap) → embedding → vector storage.
* `DOC-4` [P0]: Cascading deletion: deleting a document removes all associated chunks and vector records.
* `DOC-5` [P1]: Explicit syllabus structure parsing to guide topic segmentation.

### 5.4 Quiz Engine & Administration
* `QZ-1` [P0]: Generate 4-option MCQs filtered by unit/topic, count (5–50), and difficulty.
* `QZ-2` [P0]: Strict LLM output validation against Pydantic schemas (up to 2 retries on malformed output).
* `QZ-3` [P0]: Draft review workbench: edit questions/options, regenerate individual questions, and view source citations.
* `QZ-4` [P0]: Publishing options: active window (start/end dates), time limit, attempt allowance, question/option shuffling, and result visibility.
* `QZ-5` [P0]: Question immutability: once any student starts an attempt, the quiz structure is locked.
* `QZ-6` [P1]: True/False and Fill-in-the-Blank generation support.
* `QZ-7` [P1]: Semantic deduplication of generated questions via cosine similarity thresholding (> 0.90).

### 5.5 Assessment Execution
* `ATT-1` [P0]: Access restricted strictly to published quizzes during the active execution window.
* `ATT-2` [P0]: Server-authoritative timer: backend computes expiration (`started_at` + `duration_min`). Client timer is display-only.
* `ATT-3` [P0]: Periodic answer autosave to preserve state across network interruptions.
* `ATT-4` [P0]: Zero answer exposure: answer keys and explanations are omitted from attempt payloads before submission.
* `ATT-5` [P1]: Options use immutable IDs (e.g., `opt_1`, `opt_2`) so client-side shuffling never alters scoring.
* `ATT-6` [P1]: Telemetry tracking logs tab switches and fullscreen exits.

### 5.6 Classroom Doubt Assistant
* `BOT-1` [P0]: Chat scoped strictly to the current classroom's vector namespace.
* `BOT-2` [P0]: Cosine similarity cutoff (default < 0.30): queries below threshold return `"This isn't covered in the uploaded notes."`
* `BOT-3` [P0]: Answers cite source filename and page number.
* `BOT-4` [P1]: Multi-turn context resolution using rolling 3-turn message history.
* `BOT-5` [P1]: Token streaming enabled for responsive output.
* `BOT-6` [P0]: Rate limiting enforced per student (e.g., 30 requests/hour).

---

## 6. Technical Specifications

### 6.1 Core Stack
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Lenis.
* **Backend:** FastAPI (Python 3.11+), Pydantic v2, Motor (Async MongoDB Driver).
* **Database & Vector Search:** MongoDB Atlas with Atlas Vector Search index.
* **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions).
* **LLM Engine:** Groq API (`llama-3.3-70b-versatile`).
* **Document Parsers:** PyMuPDF (`fitz`), `python-docx`, `python-pptx`.

### 6.2 Data Models

```yaml
users:
  _id: ObjectId
  name: string
  email: string (unique)
  password_hash: string
  role: "teacher" | "student"
  department: string?
  roll_no: string?
  is_approved: boolean
  created_at: timestamp

classrooms:
  _id: ObjectId
  name: string
  subject: string
  semester: string
  teacher_id: ObjectId (ref: users)
  class_code: string (unique)
  password_hash: string
  joining_enabled: boolean
  chatbot_enabled: boolean
  is_archived: boolean
  created_at: timestamp

documents:
  _id: ObjectId
  classroom_id: ObjectId (ref: classrooms)
  filename: string
  file_url: string
  file_type: string
  unit: string?
  topic: string?
  status: "uploaded" | "processing" | "ready" | "failed"
  page_count: int
  created_at: timestamp

chunks:
  _id: ObjectId
  classroom_id: ObjectId (ref: classrooms)
  doc_id: ObjectId (ref: documents)
  text: string
  token_count: int
  embedding: float[384]
  unit: string?
  topic: string?
  page: int
  chunk_index: int

quizzes:
  _id: ObjectId
  classroom_id: ObjectId (ref: classrooms)
  created_by: ObjectId (ref: users)
  title: string
  status: "draft" | "published" | "closed"
  total_marks: int
  questions: list[{
    q_id: string
    question: string
    options: list[{ opt_id: string, text: string }]
    correct_opt_id: string
    explanation: string
    difficulty: "easy" | "medium" | "hard"
    topic: string
    source_chunk_ids: list[ObjectId]
  }]
  settings: {
    start_at: timestamp
    deadline: timestamp
    duration_min: int
    attempts_allowed: int
    shuffle_questions: boolean
    shuffle_options: boolean
    show_results: "immediate" | "after_deadline"
  }
  created_at: timestamp
  published_at: timestamp?

attempts:
  _id: ObjectId
  quiz_id: ObjectId (ref: quizzes)
  classroom_id: ObjectId (ref: classrooms)
  student_id: ObjectId (ref: users)
  attempt_no: int
  started_at: timestamp
  expires_at: timestamp
  submitted_at: timestamp?
  answers: list[{
    q_id: string
    selected_opt_id: string
    answered_at: timestamp
  }]
  score: float?
  total: int
  percentage: float?
  tab_switch_count: int
  status: "in_progress" | "submitted" | "auto_submitted"

  7. Reliability & Security Guarantees
Server-Controlled Timer: Submissions received after expires_at + 30s (grace period) are evaluated using the last saved state and finalized as auto_submitted.

Zero Answer Exposure: The student view endpoint GET /quizzes/{qid} strips correct_opt_id, explanation, and source_chunk_ids.

Document Deletion Isolation: Deleting a document does not corrupt published quizzes. Quizzes maintain their embedded question snapshots, while citation links show as archived.