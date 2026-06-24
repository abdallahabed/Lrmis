from fastapi import APIRouter, Depends, Query, Header
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.schemas.application import (
    ApplicationCreate, TransitionRequest, HoldRequest, RejectRequest,
    CommentCreate, ObjectionCreate, DocumentCreate,
)
from app.services import application_service

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post("/", summary="Create new land registration application", status_code=201)
async def create_application(
    data: ApplicationCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await application_service.create_application(db, data, idempotency_key)


@router.get("/", summary="List applications with filters, pagination, sorting")
async def list_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    application_type: str = Query(None),
    zone_id: str = Query(None),
    priority: str = Query(None),
    applicant_id: str = Query(None),
    search: str = Query(None),
    sort_by: str = Query("submitted_at"),
    sort_dir: int = Query(-1, description="-1 for desc, 1 for asc"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await application_service.list_applications(
        db, page, limit, status, application_type, zone_id, priority, applicant_id, search, sort_by, sort_dir
    )


@router.get("/{application_id}", summary="Get full application details")
async def get_application(application_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await application_service.get_application(db, application_id)


@router.patch("/{application_id}/transition", summary="Move application to next workflow state")
async def transition_application(
    application_id: str,
    data: TransitionRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await application_service.transition_application(db, application_id, data)


@router.post("/{application_id}/hold", summary="Place application on hold")
async def hold_application(
    application_id: str,
    data: HoldRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await application_service.hold_application(db, application_id, data)


@router.post("/{application_id}/reject", summary="Reject application with mandatory reason")
async def reject_application(
    application_id: str,
    data: RejectRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await application_service.reject_application(db, application_id, data)


@router.post("/{application_id}/documents", summary="Add document metadata")
async def add_document(
    application_id: str,
    data: DocumentCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await application_service.add_document(db, application_id, data)


@router.get("/{application_id}/documents", summary="Get all documents for application")
async def get_documents(application_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await application_service.get_application_documents(db, application_id)


@router.post("/{application_id}/comments", summary="Add comment or applicant response")
async def add_comment(
    application_id: str,
    data: CommentCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await application_service.add_comment(db, application_id, data)


@router.post("/{application_id}/objections", summary="Submit an objection")
async def submit_objection(
    application_id: str,
    data: ObjectionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await application_service.submit_objection(db, application_id, data)


@router.get("/{application_id}/timeline", summary="View application status timeline")
async def get_timeline(application_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await application_service.get_timeline(db, application_id)


@router.get("/{application_id}/objections", summary="Get all objections for an application")
async def get_objections(application_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await application_service.get_application_objections(db, application_id)


@router.post("/{application_id}/certificate", summary="Generate certificate metadata after approval")
async def generate_certificate(application_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    from app.utils.helpers import utcnow, generate_certificate_id, serialize_doc
    from app.services.application_service import _find_application
    from bson import ObjectId

    doc = await _find_application(db, application_id)

    if doc["status"] != "approved":
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Certificate can only be issued for approved applications")

    cert_id = generate_certificate_id()
    now = utcnow()

    cert = {
        "certificate_id": cert_id,
        "application_id": doc["_id"],
        "parcel_ref": doc.get("parcel_ref"),
        "certificate_type": "ownership_certificate",
        "status": "issued",
        "issued_to": {
            "applicant_id": doc.get("applicant_ref", {}).get("applicant_id"),
            "full_name": doc.get("applicant_ref", {}).get("full_name"),
        },
        "issued_at": now,
        "issued_by": doc.get("assignment", {}).get("assigned_registrar_id", "system"),
        "verification": {
            "qr_code_url": f"/certificates/{cert_id}/verify",
            "digital_signature_stub": f"signed_{cert_id}",
        },
    }

    await db.certificates.insert_one(cert)

    await db.land_applications.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": "certificate_issued",
            "certificate_id": cert_id,
            "workflow.current_state": "certificate_issued",
            "workflow.allowed_next": ["closed"],
            "timestamps.certificate_issued_at": now,
            "timestamps.updated_at": now,
        }},
    )

    cert["application_id"] = application_id
    return serialize_doc(cert)
