import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("syllabusiq.database")

class DatabaseManager:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_manager = DatabaseManager()

async def connect_to_mongo():
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
        db_manager.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
        db_manager.db = db_manager.client[settings.DATABASE_NAME]
        
        # Test connection ping
        await db_manager.client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB database '{settings.DATABASE_NAME}'")
        
        # Initialize collections and indices
        await init_indices()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        # Note: App will still boot and handle operations gracefully

async def close_mongo_connection():
    if db_manager.client:
        logger.info("Closing MongoDB connection...")
        db_manager.client.close()
        logger.info("MongoDB connection closed.")

async def init_indices():
    if db_manager.db is None:
        return
    try:
        # User indices
        await db_manager.db.users.create_index("email", unique=True)
        
        # Classroom indices
        await db_manager.db.classrooms.create_index("class_code", unique=True)
        await db_manager.db.classrooms.create_index("teacher_id")
        
        # Ingestion Document & Chunk indices
        await db_manager.db.documents.create_index("classroom_id")
        await db_manager.db.chunks.create_index("classroom_id")
        await db_manager.db.chunks.create_index("doc_id")
        
        # Quiz & Attempt indices
        await db_manager.db.quizzes.create_index("classroom_id")
        await db_manager.db.attempts.create_index([("quiz_id", 1), ("student_id", 1)])
        
        logger.info("Database indexes verified.")
    except Exception as e:
        logger.warning(f"Index initialization warning: {e}")

def get_database() -> AsyncIOMotorDatabase:
    return db_manager.db
