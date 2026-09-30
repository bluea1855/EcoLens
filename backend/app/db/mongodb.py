import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    db = None


db = Database()


async def connect_to_mongo():
    if not settings.MONGODB_URI:
        logger.warning("MONGODB_URI not set. Operating without database persistence.")
        return
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
        db.db = db.client[settings.MONGODB_DB_NAME]
        # Quick ping test
        await db.client.admin.command('ping')
        logger.info(f"Connected to MongoDB at {settings.MONGODB_URI}")
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB: {e}. Falling back to in-memory/mock storage.")
        db.client = None
        db.db = None


async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB connection")


def get_database():
    return db.db
