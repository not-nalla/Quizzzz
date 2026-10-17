# SyllabusIQ — RAG-Powered Academic Assessment Platform

SyllabusIQ is a high-reliability, Retrieval-Augmented Generation (RAG) classroom and assessment platform designed for universities, colleges, and higher education faculty.

Faculty members upload syllabus documents, lecture notes, and slide decks to auto-generate syllabus-aligned quizzes using Groq (`llama-3.3-70b-versatile`). Students enroll via classroom codes, take server-synchronized timed tests with integrity telemetry, view detailed analytics, and resolve course doubts with an AI assistant strictly scoped to verified course materials.

---

## 1. System Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────┐
│                   Frontend (React 19)                  │
│   Vite • TypeScript • Tailwind CSS • shadcn/ui         │
│   Framer Motion • transitions.dev • react-bits • Lenis │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST / JSON
┌──────────────────────────▼─────────────────────────────┐
│                   Backend (FastAPI)                    │
│   Python 3.11+ • Pydantic v2 • Motor (Async Mongo)     │
│   Dual-Token JWT • 12-round bcrypt • PyMuPDF • pptx    │
└──────────────────────────┬─────────────────────────────┘
                           │ RAG & Embeddings
┌──────────────────────────▼─────────────────────────────┐
│                 AI & Database Layer                    │
│   • Groq API (llama-3.3-70b-versatile)                 │
│   • Google Gemini API (Embedding & Secondary LLM)      │
│   • MongoDB (Local / Atlas Vector Index)               │
└────────────────────────────────────────────────────────┘
```

---

## 2. Project Directory Structure

```text
Quizz/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point, CORS, lifespan handlers
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic BaseSettings loading .env
│   │   │   ├── database.py          # Motor async MongoDB client & index setup
│   │   │   ├── security.py          # 12-round bcrypt hashing, JWT access & refresh tokens
│   │   │   └── deps.py              # Auth dependencies: get_current_user, require_teacher
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic schemas (Users, Classrooms, Quizzes, Attempts, Chat)
│   │   ├── routers/
│   │   │   ├── auth.py              # Register, login, refresh, profile, Google OAuth
│   │   │   ├── classrooms.py        # Classroom CRUD, join by code, roster, activity feed
│   │   │   ├── documents.py         # Multi-format upload, chunk inspection, cascading delete
│   │   │   ├── quizzes.py           # RAG quiz generation, draft review, locked publishing
│   │   │   ├── attempts.py          # Exam runner, server-synced timer, telemetry, grading
│   │   │   ├── chat.py              # Notes-grounded doubt assistant with citation badges
│   │   │   └── analytics.py         # Score distributions, question accuracy, CSV export
│   │   └── services/
│   │       ├── ingestion/
│   │       │   ├── parser.py        # PyMuPDF (PDF), python-docx, python-pptx, TXT
│   │       │   ├── chunker.py       # 500–800 token semantic chunker with 100-token overlap
│   │       │   └── embedder.py      # Google Gemini / local semantic vector projector
│   │       └── rag/
│   │           ├── retriever.py     # Cosine similarity vector retrieval in classroom scope
│   │           ├── generator.py     # Groq llama-3.3-70b structured quiz authoring
│   │           └── chat_assistant.py# Cosine threshold gating (< 0.30 refusal) & citations
│   ├── uploads/                     # Ingested PDF and document storage directory
│   ├── tests/
│   │   └── test_api.py              # Automated test suite (9 integration tests)
│   ├── requirements.txt             # Python backend dependencies
│   ├── .env.example                 # Environment configuration template
│   └── .env                         # Active backend environment variables
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts            # Axios instance with JWT refresh interceptors
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Card, Input, Badge, Dialog, Sheet, Progress, SpotlightCard
│   │   │   └── shared/              # Navbar with classroom switcher and demo persona toggle
│   │   ├── features/
│   │   │   ├── auth/                # Login and Signup pages with institutional code verification
│   │   │   ├── classroom/           # Course dashboard, Knowledge Base, Quizzes, Analytics, Roster
│   │   │   ├── quiz/                # Exam runner with server timer, option cards, tab telemetry
│   │   │   └── chat/                # Doubt AI assistant with citation drawers and refusal cards
│   │   ├── lib/
│   │   │   ├── mockData.ts          # Comprehensive academic mock datasets
│   │   │   ├── motion.ts            # transitions.dev cubic-bezier [0.16, 1, 0.3, 1] tokens
│   │   │   └── utils.ts             # Tailwind class merge helper
│   │   ├── store/
│   │   │   ├── useAuthStore.ts      # Auth & role toggle state
│   │   │   └── useClassroomStore.ts # Reactive classroom, quiz, and doubt state
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces mirroring backend schemas
│   │   ├── App.tsx                  # Client router
│   │   └── main.tsx                 # Application mount
│   ├── tailwind.config.js           # 4px grid design tokens (Slate + Blue-600)
│   └── package.json                 # Frontend dependencies
├── requirements/
│   ├── Agent.md                     # Agent development instructions
│   ├── Design.md                    # Master motion, token, and design spec
│   └── Prd.md                       # Comprehensive product requirements document
└── README.md                        # Project documentation (this file)
```

---

## 3. Quickstart & How to Run

### Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: v18 or higher (with npm)
- **MongoDB**: Running locally on port `27017` or a MongoDB Atlas URI

### Step 1: Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Verify and run tests
python -m pytest tests/ -v

# Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API Health: `http://127.0.0.1:8000/api/health`
* Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

### Step 2: Frontend Setup
```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite dev server
npm run dev
```
* Frontend Application: `http://localhost:5173`

---

## 4. Groq API Configuration

SyllabusIQ utilizes Groq’s ultra-low-latency `llama-3.3-70b-versatile` model to power:
1. **RAG Quiz Generation**: Authoring syllabus-grounded 4-option MCQs with explanations and source citations.
2. **Classroom Doubt Assistant**: Answering student doubts with citation pill tags and exact page numbers.

### Adding Your Groq API Key
1. Get a free API key at [console.groq.com](https://console.groq.com/keys).
2. Open `backend/.env` and paste your key:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```
3. Restart the backend. Groq will be automatically used for all quiz generation and AI doubt queries.

---

## 5. Where to Store & Upload Course Documents for RAG

All syllabus materials (PDFs, Word documents, PowerPoint decks, text notes) are processed by the semantic chunking engine (500–800 tokens, 100-token overlap) and vectorized for retrieval.

### Method 1: Upload via the Web Interface (Recommended)
1. Open `http://localhost:5173/dashboard`
2. Select your course from the top dropdown or create a new one.
3. Click the **"Upload Notes"** button.
4. Select your `.pdf`, `.docx`, `.pptx`, or `.txt` file, specify the Unit and Topic tags, and click **"Ingest & Vectorize"**.
5. The document will be chunked, embedded, and stored in MongoDB. You can inspect the chunks anytime by clicking **"Inspect Chunks"** in the Knowledge Base tab.

### Method 2: File System Directory Path
All files uploaded to the platform are stored on disk in:
```text
c:\Users\vighn\OneDrive\Desktop\Quizz\backend\uploads\
```
You can place your syllabus files directly in `backend/uploads/` to reference them.

---

## 6. Google OAuth 2.0 Setup Guide

To enable "Sign in with Google", configure credentials in the Google Cloud Console:

### Step 1: Open Google Cloud Console
1. Navigate to [console.cloud.google.com](https://console.cloud.google.com/).
2. Create a new project (e.g. `SyllabusIQ-Academic`).

### Step 2: Configure the OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select User Type: **External** (or **Internal** for Google Workspace institutions).
3. Fill in:
   - App name: `SyllabusIQ`
   - User support email: your email
   - Developer contact email: your email
4. Scopes: Add `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
5. Save and continue.

### Step 3: Create OAuth Client ID
1. Go to **APIs & Services** > **Credentials**.
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
3. Application type: Select **Web application**.
4. Name: `SyllabusIQ Web Client`.
5. **Authorized JavaScript origins**:
   ```text
   http://localhost:5173
   http://127.0.0.1:5173
   ```
6. **Authorized redirect URIs**:
   ```text
   http://localhost:5173
   http://localhost:5173/auth/google/callback
   http://localhost:8000/api/v1/auth/google/callback
   ```
7. Click **Create**. Copy the generated **Client ID** and **Client Secret**.

### Step 4: Add Credentials to `.env`
Open `backend/.env` and set:
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

---

## 7. Institutional Role Model & Demo Access

| Persona | Credentials | Capabilities |
| :--- | :--- | :--- |
| **Faculty (Teacher)** | `e.vance@stanford.edu` / `password123` | Create classrooms, upload syllabus notes, generate quizzes, edit drafts, publish exams, gradebook CSV export |
| **Student** | `a.rivera@stanford.edu` / `password123` | Enroll via code, take server-timed exams, view verified results, query doubt AI |
| **Faculty Invite Gate** | Code: `INST-STANFORD-2026` | Required during faculty registration to prevent student role escalation |

---

## 8. Anti-Slop Academic Design Principles

1. **Academic Slate Palette**: Precision Blue-600 focus (`hsl(221.2 83.2% 53.3%)`), Slate neutrals, zero saturated purple/indigo gradients.
2. **Zero Emojis**: Institutional iconography exclusively powered by `lucide-react` with `strokeWidth={1.75}`.
3. **transitions.dev Motion**: Calibrated mechanical easing using `cubic-bezier(0.16, 1, 0.3, 1)` with durations between $180\text{--}280\,\text{ms}$.
4. **react-bits Components**: `SpotlightCard` cursor tracking and `AnimatedCounter` score animations.
5. **Server-Authoritative Proctoring**: Expiration timers and option IDs are computed server-side; client tab switching telemetry tracks focus loss.
