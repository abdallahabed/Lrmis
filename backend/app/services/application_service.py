from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from app.schemas.application import (
    ApplicationCreate, TransitionRequest, HoldRequest, RejectRequest,
    CommentCreate, ObjectionCreate, DocumentCreate,
    ALLOWED_TRANSITIONS, TRANSITION_RULES,
)
from app.utils.helpers import utcnow, serialize_doc, generate_application_id
import logging

logger = logging.getLogger(__name__)

# Document types required per application type
REQUIRED_DOCS_MAP = {
    "first_registration": ["ownership_deed", "id_copy", "survey_plan"],
    "ownership_transfer": ["ownership_deed", "id_copy", "sale_contract"],
    "parcel_subdivision": ["ownership_deed", "id_copy", "subdivision_plan"],
    "parcel_merge": ["ownership_deed", "id_copy", "merge_plan"],
    "boundary_correction": ["ownership_deed", "id_copy", "boundary_survey"],
    "certificate_request": ["id_copy", "previous_certificate"],
}


async def create_application(
    db: AsyncIOMotorDatabase,
    data: ApplicationCreate,
    idempotency_key: str = None,
) -> dict:
    # Idempotency check
    if idempotency_key:
        existing = await db.land_applications.find_one({"idempotency_key": idempotency_key})
        if existing:
            logger.info(f"Idempotency hit for key: {idempotency_key}")
            return _format_application(existing)

    # Validate applicant exists
    if not ObjectId.is_valid(data.applicant_id):
        raise HTTPException(status_code=400, detail="Invalid applicant ID")

    applicant = await db.applicants.find_one({"_id": ObjectId(data.applicant_id)})
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    if applicant.get("verification_state") == "suspended":
        raise HTTPException(status_code=403, detail="Applicant account is suspended")

    now = utcnow()
    application_id = generate_application_id()

    # Build required documents list
    required_docs = [
        {"document_type": dt, "required": True, "status": "pending"}
        for dt in REQUIRED_DOCS_MAP.get(data.application_type, ["id_copy"])
    ]

    doc = {
        "application_id": application_id,
        "application_type": data.application_type,
        "status": "submitted",
        "priority": data.priority,
        "idempotency_key": idempotency_key or data.idempotency_key,
        "applicant_ref": {
            "applicant_id": ObjectId(data.applicant_id),
            "applicant_type": applicant.get("applicant_type"),
            "full_name": applicant.get("full_name"),
            "submitted_by_representative": data.submitted_by_representative,
            "representative_id": data.representative_id,
        },
        "parcel_ref": {
            "parcel_number": data.parcel_ref.parcel_number,
            "block_number": data.parcel_ref.block_number,
            "basin_number": data.parcel_ref.basin_number,
            "zone_id": data.parcel_ref.zone_id,
            "location": data.parcel_ref.location.model_dump() if data.parcel_ref.location else None,
        },
        "description": data.description,
        "tags": data.tags or [],
        "workflow": {
            "current_state": "submitted",
            "allowed_next": ALLOWED_TRANSITIONS["submitted"],
            "transition_rules_version": "v1.0",
        },
        "required_documents": required_docs,
        "timestamps": {
            "submitted_at": now,
            "pre_checked_at": None,
            "survey_required_at": None,
            "surveyed_at": None,
            "legal_review_at": None,
            "approved_at": None,
            "certificate_issued_at": None,
            "closed_at": None,
            "updated_at": now,
        },
        "assignment": {
            "assigned_surveyor_id": None,
            "assigned_registrar_id": None,
            "assignment_policy": "zone+workload+availability",
        },
        "objection": {
            "has_objection": False,
            "objection_ids": [],
        },
        "internal": {
            "notes": [],
            "visibility": "staff_only",
            "rejection_reason": None,
            "hold_reason": None,
        },
        "certificate_id": None,
        "comments": [],
        "created_at": now,
        "updated_at": now,
    }

    result = await db.land_applications.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update applicant stats
    await db.applicants.update_one(
        {"_id": ObjectId(data.applicant_id)},
        {
            "$inc": {"stats.total_applications": 1, "stats.pending_applications": 1},
            "$push": {"linked_application_ids": result.inserted_id},
        },
    )

    # Log to performance_logs
    await _log_event(db, result.inserted_id, "submitted", "applicant", data.applicant_id, {"channel": "web"})

    return _format_application(doc)


async def get_application(db: AsyncIOMotorDatabase, application_id: str) -> dict:
    doc = await _find_application(db, application_id)
    return _format_application(doc)


async def list_applications(
    db: AsyncIOMotorDatabase,
    page: int = 1,
    limit: int = 20,
    status: str = None,
    application_type: str = None,
    zone_id: str = None,
    priority: str = None,
    applicant_id: str = None,
    search: str = None,
    sort_by: str = "submitted_at",
    sort_dir: int = -1,
) -> dict:
    query = {}

    if status:
        query["status"] = status
    if application_type:
        query["application_type"] = application_type
    if zone_id:
        query["parcel_ref.zone_id"] = zone_id
    if priority:
        query["priority"] = priority
    if applicant_id and ObjectId.is_valid(applicant_id):
        query["applicant_ref.applicant_id"] = ObjectId(applicant_id)
    if search:
        query["$or"] = [
            {"application_id": {"$regex": search, "$options": "i"}},
            {"parcel_ref.parcel_number": {"$regex": search, "$options": "i"}},
            {"applicant_ref.full_name": {"$regex": search, "$options": "i"}},
        ]

    sort_field = f"timestamps.{sort_by}" if sort_by in ["submitted_at", "updated_at"] else sort_by
    skip = (page - 1) * limit
    total = await db.land_applications.count_documents(query)
    cursor = db.land_applications.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return {
        "items": [_format_application(d) for d in docs],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


async def transition_application(
    db: AsyncIOMotorDatabase,
    application_id: str,
    data: TransitionRequest,
) -> dict:
    doc = await _find_application(db, application_id)
    current = doc["status"]
    target = data.target_state

    # Validate transition
    if target not in ALLOWED_TRANSITIONS.get(current, []):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot transition from '{current}' to '{target}'. "
                   f"Allowed: {ALLOWED_TRANSITIONS.get(current, [])}",
        )

    # Enforce transition rules
    await _enforce_transition_rules(db, doc, target)

    now = utcnow()
    timestamp_key = f"timestamps.{target}_at"

    update = {
        "$set": {
            "status": target,
            "workflow.current_state": target,
            "workflow.allowed_next": ALLOWED_TRANSITIONS.get(target, []),
            timestamp_key: now,
            "timestamps.updated_at": now,
            "updated_at": now,
        }
    }

    await db.land_applications.update_one({"_id": doc["_id"]}, update)
    await _log_event(db, doc["_id"], target, data.actor_type, data.actor_id, {"reason": data.reason})

    updated = await db.land_applications.find_one({"_id": doc["_id"]})
    return _format_application(updated)


async def hold_application(db: AsyncIOMotorDatabase, application_id: str, data: HoldRequest) -> dict:
    doc = await _find_application(db, application_id)

    if doc["status"] in ["closed", "rejected"]:
        raise HTTPException(status_code=400, detail="Cannot hold a closed or rejected application")

    now = utcnow()
    await db.land_applications.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "on_hold",
                "workflow.current_state": "on_hold",
                "workflow.allowed_next": ALLOWED_TRANSITIONS["on_hold"],
                "internal.hold_reason": data.reason,
                "timestamps.updated_at": now,
                "updated_at": now,
            }
        },
    )

    await _log_event(db, doc["_id"], "on_hold", "staff", data.actor_id, {"reason": data.reason})
    updated = await db.land_applications.find_one({"_id": doc["_id"]})
    return _format_application(updated)


async def reject_application(db: AsyncIOMotorDatabase, application_id: str, data: RejectRequest) -> dict:
    doc = await _find_application(db, application_id)

    if doc["status"] in ["closed", "rejected", "certificate_issued"]:
        raise HTTPException(status_code=400, detail=f"Cannot reject application in '{doc['status']}' state")

    now = utcnow()
    await db.land_applications.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "rejected",
                "workflow.current_state": "rejected",
                "workflow.allowed_next": [],
                "internal.rejection_reason": data.reason,
                "internal.legal_basis": data.legal_basis,
                "timestamps.updated_at": now,
                "updated_at": now,
            }
        },
    )

    # Update applicant stats
    applicant_id = doc.get("applicant_ref", {}).get("applicant_id")
    if applicant_id:
        await db.applicants.update_one(
            {"_id": applicant_id},
            {"$inc": {"stats.pending_applications": -1, "stats.rejected_applications": 1}},
        )

    await _log_event(db, doc["_id"], "rejected", "staff", data.actor_id, {"reason": data.reason})
    updated = await db.land_applications.find_one({"_id": doc["_id"]})
    return _format_application(updated)


async def add_document(db: AsyncIOMotorDatabase, application_id: str, data: DocumentCreate) -> dict:
    doc = await _find_application(db, application_id)

    if doc["status"] in ["closed", "rejected"]:
        raise HTTPException(status_code=400, detail="Cannot add documents to a closed or rejected application")

    now = utcnow()
    document = {
        "application_id": doc["_id"],
        "document_type": data.document_type,
        "file_name": data.file_name,
        "file_size_kb": data.file_size_kb,
        "mime_type": data.mime_type,
        "description": data.description,
        "uploaded_by": data.uploaded_by,
        "review_status": "pending_review",
        "uploaded_at": now,
    }

    result = await db.application_documents.insert_one(document)

    # Update the required_documents status if this type was required
    await db.land_applications.update_one(
        {"_id": doc["_id"], "required_documents.document_type": data.document_type},
        {"$set": {"required_documents.$.status": "pending_review", "timestamps.updated_at": now}},
    )

    # If no required doc matched, it might be a supplementary document
    await _log_event(db, doc["_id"], "document_uploaded", "applicant", data.uploaded_by,
                     {"document_type": data.document_type})

    document["_id"] = str(result.inserted_id)
    document["application_id"] = application_id
    return serialize_doc(document)


async def add_comment(db: AsyncIOMotorDatabase, application_id: str, data: CommentCreate) -> dict:
    doc = await _find_application(db, application_id)

    now = utcnow()
    comment = {
        "content": data.content,
        "author_id": data.author_id,
        "author_type": data.author_type,
        "visibility": data.visibility,
        "created_at": now,
    }

    await db.land_applications.update_one(
        {"_id": doc["_id"]},
        {"$push": {"comments": comment}, "$set": {"timestamps.updated_at": now}},
    )

    return {"message": "Comment added successfully", "comment": serialize_doc(comment)}


async def submit_objection(db: AsyncIOMotorDatabase, application_id: str, data: ObjectionCreate) -> dict:
    doc = await _find_application(db, application_id)

    if doc["status"] in ["closed", "rejected"]:
        raise HTTPException(status_code=400, detail="Cannot submit objection on a closed or rejected application")

    now = utcnow()
    objection = {
        "application_id": doc["_id"],
        "application_ref": application_id,
        "applicant_id": data.applicant_id,
        "objection_reason": data.objection_reason,
        "supporting_evidence": data.supporting_evidence,
        "contact_info": data.contact_info,
        "status": "pending",
        "submitted_at": now,
        "resolved_at": None,
        "resolution_notes": None,
    }

    result = await db.objections.insert_one(objection)
    objection_id = result.inserted_id

    # Update application
    await db.land_applications.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": "under_objection",
                "workflow.current_state": "under_objection",
                "workflow.allowed_next": ALLOWED_TRANSITIONS["under_objection"],
                "objection.has_objection": True,
                "timestamps.updated_at": now,
            },
            "$push": {"objection.objection_ids": objection_id},
        },
    )

    await _log_event(db, doc["_id"], "under_objection", "applicant", data.applicant_id,
                     {"objection_id": str(objection_id)})

    objection["_id"] = str(objection_id)
    objection["application_id"] = application_id
    return serialize_doc(objection)


async def get_timeline(db: AsyncIOMotorDatabase, application_id: str) -> dict:
    doc = await _find_application(db, application_id)

    # Fetch performance logs
    log = await db.performance_logs.find_one({"application_id": doc["_id"]})
    events = log.get("event_stream", []) if log else []

    # Build timeline from timestamps + events
    ts = doc.get("timestamps", {})
    timeline = []

    status_labels = {
        "submitted": "Application Submitted",
        "pre_checked": "Pre-Check Completed",
        "survey_required": "Field Survey Required",
        "surveyed": "Field Survey Completed",
        "legal_review": "Legal Review Started",
        "approved": "Application Approved",
        "certificate_issued": "Certificate Issued",
        "closed": "Application Closed",
        "rejected": "Application Rejected",
        "on_hold": "Application Put On Hold",
        "missing_documents": "Missing Documents Requested",
        "under_objection": "Objection Filed",
    }

    for state, label in status_labels.items():
        key = f"{state}_at"
        if ts.get(key):
            timeline.append({
                "state": state,
                "label": label,
                "timestamp": ts[key].isoformat() if hasattr(ts[key], "isoformat") else ts[key],
                "is_current": doc["status"] == state,
            })

    # Enrich with event stream details
    for event in events:
        for item in timeline:
            if item["state"] == event.get("type"):
                item["actor"] = event.get("by", {})
                item["meta"] = event.get("meta", {})

    return {
        "application_id": application_id,
        "current_status": doc["status"],
        "timeline": sorted(timeline, key=lambda x: x["timestamp"]),
    }


async def get_application_documents(db: AsyncIOMotorDatabase, application_id: str) -> dict:
    doc = await _find_application(db, application_id)
    cursor = db.application_documents.find({"application_id": doc["_id"]})
    docs = await cursor.to_list(length=100)
    return {
        "application_id": application_id,
        "required_documents": doc.get("required_documents", []),
        "uploaded_documents": [serialize_doc(d) for d in docs],
    }


async def get_application_objections(db: AsyncIOMotorDatabase, application_id: str) -> dict:
    doc = await _find_application(db, application_id)
    cursor = db.objections.find({"application_id": doc["_id"]})
    objections = await cursor.to_list(length=50)
    return {
        "application_id": application_id,
        "has_objection": doc.get("objection", {}).get("has_objection", False),
        "objections": [serialize_doc(o) for o in objections],
    }


# ── Internal Helpers ──────────────────────────────────────────────────

async def _find_application(db: AsyncIOMotorDatabase, application_id: str) -> dict:
    """Find by ObjectId or application_id string like LRMIS-2026-0001."""
    doc = None

    if ObjectId.is_valid(application_id):
        doc = await db.land_applications.find_one({"_id": ObjectId(application_id)})

    if not doc:
        doc = await db.land_applications.find_one({"application_id": application_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")

    return doc


async def _enforce_transition_rules(db: AsyncIOMotorDatabase, doc: dict, target: str):
    """Enforce business rules for state transitions."""

    if target == "pre_checked":
        ref = doc.get("applicant_ref", {})
        parcel = doc.get("parcel_ref", {})
        if not ref.get("full_name") or not parcel.get("parcel_number") or not parcel.get("block_number"):
            raise HTTPException(
                status_code=422,
                detail="Cannot pre-check: applicant and parcel information must be complete",
            )

    elif target == "survey_required":
        parcel = doc.get("parcel_ref", {})
        if not parcel.get("location"):
            raise HTTPException(
                status_code=422,
                detail="Cannot require survey: parcel location (GeoJSON) must be provided",
            )

    elif target == "surveyed":
        survey = await db.survey_tasks.find_one({"application_id": doc["_id"]})
        if not survey:
            raise HTTPException(
                status_code=422,
                detail="Cannot mark as surveyed: no survey task exists for this application",
            )

    elif target == "legal_review":
        docs_cursor = db.application_documents.find({"application_id": doc["_id"]})
        uploaded = await docs_cursor.to_list(length=100)
        ownership_docs = [d for d in uploaded if d.get("document_type") == "ownership_deed"]
        if not ownership_docs:
            raise HTTPException(
                status_code=422,
                detail="Cannot start legal review: ownership documents must be uploaded",
            )

    elif target == "approved":
        # Check that legal review timestamp exists
        if not doc.get("timestamps", {}).get("legal_review_at"):
            raise HTTPException(
                status_code=422,
                detail="Cannot approve: legal review must be completed first",
            )

    elif target == "certificate_issued":
        if doc.get("status") != "approved":
            raise HTTPException(
                status_code=422,
                detail="Cannot issue certificate: application must be in approved state",
            )

    elif target == "rejected":
        pass  # reason is enforced at schema level


async def _log_event(
    db: AsyncIOMotorDatabase,
    application_oid: ObjectId,
    event_type: str,
    actor_type: str,
    actor_id: str,
    meta: dict = None,
):
    now = utcnow()
    event = {
        "type": event_type,
        "by": {"actor_type": actor_type, "actor_id": str(actor_id)},
        "at": now,
        "meta": meta or {},
    }

    existing_log = await db.performance_logs.find_one({"application_id": application_oid})
    if existing_log:
        await db.performance_logs.update_one(
            {"application_id": application_oid},
            {"$push": {"event_stream": event}},
        )
    else:
        await db.performance_logs.insert_one({
            "application_id": application_oid,
            "event_stream": [event],
            "computed_kpis": {
                "processing_days": None,
                "precheck_minutes": None,
                "survey_delay_days": None,
                "certificate_issued": False,
            },
            "created_at": now,
        })


def _format_application(doc: dict) -> dict:
    result = serialize_doc(doc)
    result["id"] = result.pop("_id", None)
    return result
