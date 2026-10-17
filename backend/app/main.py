import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, classrooms, documents, quizzes, attempts, chat, analytics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("syllabusiq.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SyllabusIQ Backend Services...")
    await connect_to_mongo()
    yield
    logger.info("Shutting down SyllabusIQ Backend Services...")
    await close_mongo_connection()

app = FastAPI(
    title="SyllabusIQ Academic Assessment API",
    description="High-reliability, RAG-powered classroom and assessment platform for higher education institutions.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware (React frontend on localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api/v1
api_v1_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(classrooms.router, prefix=api_v1_prefix)
app.include_router(documents.router, prefix=api_v1_prefix)
app.include_router(quizzes.router, prefix=api_v1_prefix)
app.include_router(attempts.router, prefix=api_v1_prefix)
app.include_router(chat.router, prefix=api_v1_prefix)
app.include_router(analytics.router, prefix=api_v1_prefix)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "SyllabusIQ Backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": settings.DATABASE_NAME,
        "rag_engine": "Google Gemini / Groq RAG Engine",
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to SyllabusIQ Academic Assessment & RAG Platform API",
        "docs": "/docs",
        "health": "/api/health",
    }
