from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING, GEOSPHERE
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    await create_indexes()
    logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


async def get_db():
    return db


async def create_indexes():
    """Create all required MongoDB indexes as specified in the project document."""
    try:
        # land_applications indexes
        await db.land_applications.create_index("application_id", unique=True)
        await db.land_applications.create_index("status")
        await db.land_applications.create_index("application_type")
        await db.land_applications.create_index("parcel_ref.parcel_number")
        await db.land_applications.create_index("parcel_ref.zone_id")
        await db.land_applications.create_index("timestamps.submitted_at")
        await db.land_applications.create_index("applicant_ref.applicant_id")

        # parcels indexes
        await db.parcels.create_index("parcel_code", unique=True)
        await db.parcels.create_index([("geometry", GEOSPHERE)])
        await db.parcels.create_index("zone_id")

        # applicants indexes
        await db.applicants.create_index("identity.national_id", unique=True)
        await db.applicants.create_index("contacts.email", unique=True)

        # staff_members indexes
        await db.staff_members.create_index("staff_code", unique=True)

        # survey_tasks indexes
        await db.survey_tasks.create_index("application_id")

        # certificates indexes
        await db.certificates.create_index("certificate_id", unique=True)

        # objections indexes
        await db.objections.create_index("application_id")

        # application_documents indexes
        await db.application_documents.create_index("application_id")

        # performance_logs indexes
        await db.performance_logs.create_index("application_id")

        logger.info("All MongoDB indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation warning (may already exist): {e}")
