
# CLAUDE.md — SyllabusIQ Developer & Agent Instructions

## 1. Project Overview & Architectural Standards
SyllabusIQ is a high-reliability, RAG-powered classroom and assessment platform for colleges.
* **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion.
* **Backend:** FastAPI (Python 3.11+) + Pydantic v2 + Motor (Async Mongo Driver) + Atlas Vector Search.
* **AI Engine:** Groq API (`llama-3.3-70b-versatile`) + `sentence-transformers/all-MiniLM-L6-v2`.

### Guiding Principles
* **Academic Aesthetic:** Zero visual clutter. Follow `design.md` strictly: Blue-600 primary, Slate neutrals, 4px grid spacing, no emojis, no arbitrary Tailwind brackets.
* **Zero Trust Client:** All authentication, expiration deadlines, and role checks live in backend dependencies. Never trust client timing or user roles.
* **Strict RAG Boundaries:** Grounding is mandatory. No ungrounded facts in quiz generation or doubt answers. Top-K similarity misses must result in refusal.

---

## 2. Directory Structure & Conventions

```text
syllabusiq/
├── backend/
│   ├── app/
│   │   ├── main.py              # Application entry, CORS, lifespan handlers
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic BaseSettings loading .env
│   │   │   ├── database.py      # Motor async client & vector index setup
│   │   │   ├── security.py      # JWT encoding/decoding, Argon2 hashing
│   │   │   └── deps.py          # FastAPI Depends: get_current_user, require_teacher
│   │   ├── models/              # Pydantic schemas (Request, Response, DB ODM)
│   │   ├── routers/             # Sub-routers (/auth, /classrooms, /quizzes, etc.)
│   │   ├── services/
│   │   │   ├── ingestion/       # Parsers (PyMuPDF, docx), Chunker, Embedder
│   │   │   ├── rag/             # Vector retrieval, QuizGenerator, ChatAssistant
│   │   │   └── analytics/       # Aggregation pipelines for accuracy and results
│   │   └── prompts/             # Versioned prompt text templates
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios instance with refresh interceptors
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui primitives
│   │   │   ├── motion/          # Lenis smooth scroll and Framer Motion wrappers
│   │   │   └── shared/          # Navbar, PageHeader, EmptyStates, Badges
│   │   ├── features/            # Feature modules (auth, classroom, quiz, chat)
│   │   ├── hooks/               # Custom React hooks (useTimer, useDebounce)
│   │   ├── pages/               # Routed page views
│   │   ├── store/               # Global state (Zustand)
│   │   └── types/               # TypeScript interfaces matching backend models
│   ├── tailwind.config.js
│   └── package.json
├── design.md                    # Master motion, token, and design spec
└── PRD.md                       # Comprehensive product requirements