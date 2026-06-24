from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from app.schemas.applicant import ApplicantCreate, ApplicantUpdate
from app.utils.helpers import utcnow, serialize_doc, generate_applicant_code
import logging

logger = logging.getLogger(__name__)


async def create_applicant(db: AsyncIOMotorDatabase, data: ApplicantCreate) -> dict:
    # Check national ID uniqueness
    existing = await db.applicants.find_one({"identity.national_id": data.identity.national_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An applicant with national ID '{data.identity.national_id}' already exists",
        )

    # Check email uniqueness
    existing_email = await db.applicants.find_one({"contacts.email": data.contacts.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An applicant with email '{data.contacts.email}' already exists",
        )

    now = utcnow()
    doc = {
        "applicant_code": generate_applicant_code(),
        "full_name": data.full_name,
        "applicant_type": data.applicant_type,
        "verification_state": "unverified",
        "identity": {
            "national_id": data.identity.national_id,
            "verified": False,
            "verification_method": None,
            "verified_at": None,
        },
        "contacts": {
            "email": data.contacts.email,
            "phone": data.contacts.phone,
        },
        "address": {
            "city": data.address.city,
            "neighborhood": data.address.neighborhood,
            "zone_id": data.address.zone_id,
            "street": data.address.street,
        },
        "preferences": data.preferences.model_dump() if data.preferences else {},
        "privacy_settings": data.privacy_settings.model_dump() if data.privacy_settings else {},
        "organization_name": data.organization_name,
        "license_number": data.license_number,
        "stats": {
            "total_applications": 0,
            "approved_applications": 0,
            "pending_applications": 0,
            "rejected_applications": 0,
        },
        "linked_application_ids": [],
        "created_at": now,
        "updated_at": now,
    }

    result = await db.applicants.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _format_applicant(doc)


async def get_applicant(db: AsyncIOMotorDatabase, applicant_id: str) -> dict:
    if not ObjectId.is_valid(applicant_id):
        raise HTTPException(status_code=400, detail="Invalid applicant ID format")

    doc = await db.applicants.find_one({"_id": ObjectId(applicant_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Applicant not found")

    return _format_applicant(doc)


async def get_applicant_by_national_id(db: AsyncIOMotorDatabase, national_id: str) -> dict:
    doc = await db.applicants.find_one({"identity.national_id": national_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return _format_applicant(doc)


async def update_applicant(db: AsyncIOMotorDatabase, applicant_id: str, data: ApplicantUpdate) -> dict:
    if not ObjectId.is_valid(applicant_id):
        raise HTTPException(status_code=400, detail="Invalid applicant ID format")

    existing = await db.applicants.find_one({"_id": ObjectId(applicant_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Applicant not found")

    update_fields = {}
    if data.full_name:
        update_fields["full_name"] = data.full_name
    if data.contacts:
        update_fields["contacts"] = {"email": data.contacts.email, "phone": data.contacts.phone}
    if data.address:
        update_fields["address"] = data.address.model_dump()
    if data.preferences:
        update_fields["preferences"] = data.preferences.model_dump()
    if data.privacy_settings:
        update_fields["privacy_settings"] = data.privacy_settings.model_dump()
    if data.organization_name is not None:
        update_fields["organization_name"] = data.organization_name
    if data.license_number is not None:
        update_fields["license_number"] = data.license_number

    update_fields["updated_at"] = utcnow()

    await db.applicants.update_one(
        {"_id": ObjectId(applicant_id)},
        {"$set": update_fields},
    )

    updated = await db.applicants.find_one({"_id": ObjectId(applicant_id)})
    return _format_applicant(updated)


async def list_applicants(
    db: AsyncIOMotorDatabase,
    page: int = 1,
    limit: int = 20,
    applicant_type: str = None,
    verification_state: str = None,
    search: str = None,
) -> dict:
    query = {}

    if applicant_type:
        query["applicant_type"] = applicant_type
    if verification_state:
        query["verification_state"] = verification_state
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"contacts.email": {"$regex": search, "$options": "i"}},
            {"identity.national_id": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db.applicants.count_documents(query)
    cursor = db.applicants.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return {
        "items": [_format_applicant(d) for d in docs],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


async def get_applicant_applications(
    db: AsyncIOMotorDatabase,
    applicant_id: str,
    page: int = 1,
    limit: int = 20,
) -> dict:
    if not ObjectId.is_valid(applicant_id):
        raise HTTPException(status_code=400, detail="Invalid applicant ID format")

    # Verify applicant exists
    applicant = await db.applicants.find_one({"_id": ObjectId(applicant_id)})
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    query = {"applicant_ref.applicant_id": ObjectId(applicant_id)}
    skip = (page - 1) * limit
    total = await db.land_applications.count_documents(query)
    cursor = db.land_applications.find(query).sort("timestamps.submitted_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return {
        "applicant_id": applicant_id,
        "applicant_name": applicant.get("full_name"),
        "items": [serialize_doc(d) for d in docs],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


def _format_applicant(doc: dict) -> dict:
    result = serialize_doc(doc)
    result["id"] = result.pop("_id", None)
    return result
