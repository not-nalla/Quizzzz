import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "syllabusiq_db"

    JWT_SECRET_KEY: str = "syllabusiq_academic_super_secret_jwt_key_2026_x86_production_grade"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    TEACHER_INVITE_CODE: str = "INST-STANFORD-2026"

    # AI & RAG Engine Keys
    GROQ_API_KEY: str = Field(default="")
    GEMINI_API_KEY: str = Field(default="")

    # Google OAuth 2.0 Credentials
    GOOGLE_CLIENT_ID: str = Field(default="")
    GOOGLE_CLIENT_SECRET: str = Field(default="")
    GOOGLE_REDIRECT_URI: str = Field(default="http://localhost:5173/auth/google/callback")

    EMBEDDING_MODEL: str = "models/embedding-001"
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    # Ordered fallback list of Groq chat models. The first reachable model wins.
    LLM_MODELS: str = "llama-3.3-70b-versatile,openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b"
    COSINE_SIMILARITY_CUTOFF: float = 0.30
    MAX_CHAT_HISTORY_TURNS: int = 3
    STUDENT_HOURLY_RATE_LIMIT: int = 30

    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 20

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def llm_model_list(self) -> List[str]:
        return [m.strip() for m in self.LLM_MODELS.split(",") if m.strip()]

settings = Settings()
