# backend/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    database = None

db = MongoDB()

async def connect_to_mongo():
    """Establish MongoDB connection"""
    db.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db.database = db.client[settings.DATABASE_NAME]
    
    # Create indexes
    await create_indexes()
    logger.info("MongoDB indexes created")

async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()

async def create_indexes():
    """Create necessary database indexes"""
    # Users collection
    await db.database.users.create_index("phone", unique=True)
    await db.database.users.create_index("email", sparse=True)
    
    # OTP sessions
    await db.database.otp_sessions.create_index("phone")
    await db.database.otp_sessions.create_index("expires_at", expire_after_seconds=0)
    
    # Menu items
    await db.database.menu_items.create_index("category")
    
    # Orders
    await db.database.orders.create_index("user_id")
    await db.database.orders.create_index("created_at")
    
    # Reservations
    await db.database.reservations.create_index("phone")
    await db.database.reservations.create_index("date")

def get_database():
    return db.database
