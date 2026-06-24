from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from app.schemas.staff import StaffCreate, StaffUpdate, SurveyMilestoneCreate, SurveyReportCreate, RegistrarReviewCreate
from app.utils.helpers import utcnow, serialize_doc
import logging

logger = logging.getLogger(__name__)

MILESTONE_ORDER = [
    "assigned", "visit_scheduled", "arrived_on_site",
    "survey_started", "survey_completed", "report_uploaded", "registrar_reviewed"
]


async def create_staff(db: AsyncIOMotorDatabase, data: StaffCreate) -> dict:
    existing = await db.staff_members.find_one({"contacts.email": data.email})
    if existing:
        raise HTTPException(status_code=409, detail="A staff member with this email already exists")

    import random, string
    code = f"{'SURV' if data.role == 'surveyor' else 'REG'}-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    now = utcnow()
    doc = {
        "staff_code": code,
        "name": data.name,
        "role": data.role,
        "department": data.department,
        "skills": data.skills or [],
        "coverage": {"zone_ids": data.zone_ids or []},
        "schedule": {
            "timezone": "Asia/Jerusalem",
            "shifts": [s.model_dump() for s in (data.shifts or [])],
            "on_call": False,
        },
        "workload": {"active_tasks": 0, "max_tasks": data.max_tasks},
        "contacts": {"email": data.email, "phone": data.phone},
        "active": True,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.staff_members.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _format_staff(doc)


async def get_staff(db: AsyncIOMotorDatabase, staff_id: str) -> dict:
    if not ObjectId.is_valid(staff_id):
        raise HTTPException(status_code=400, detail="Invalid staff ID")
    doc = await db.staff_members.find_one({"_id": ObjectId(staff_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return _format_staff(doc)


async def list_staff(db: AsyncIOMotorDatabase, role: str = None, active: bool = True) -> dict:
    query = {}
    if role:
        query["role"] = role
    if active is not None:
        query["active"] = active
    cursor = db.staff_members.find(query).sort("name", 1)
    docs = await cursor.to_list(length=200)
    return {"items": [_format_staff(d) for d in docs], "total": len(docs)}


async def auto_assign_surveyor(db: AsyncIOMotorDatabase, application_id: str) -> dict:
    """Auto-assign based on zone match + workload balance."""
    from app.services.application_service import _find_application, _log_event

    app_doc = await _find_application(db, application_id)
    zone_id = app_doc.get("parcel_ref", {}).get("zone_id")

    # Find available surveyors in zone with capacity
    surveyors = await db.staff_members.find({
        "role": "surveyor",
        "active": True,
        "coverage.zone_ids": zone_id,
        "$expr": {"$lt": ["$workload.active_tasks", "$workload.max_tasks"]},
    }).sort("workload.active_tasks", 1).to_list(length=10)

    if not surveyors:
        # Fallback: any available surveyor
        surveyors = await db.staff_members.find({
            "role": "surveyor",
            "active": True,
            "$expr": {"$lt": ["$workload.active_tasks", "$workload.max_tasks"]},
        }).sort("workload.active_tasks", 1).to_list(length=5)

    if not surveyors:
        raise HTTPException(status_code=422, detail="No available surveyors found")

    surveyor = surveyors[0]
    now = utcnow()

    # Create survey task
    task = {
        "task_id": f"SURV-{now.year}-{str(app_doc['_id'])[-4:]}",
        "application_id": app_doc["_id"],
        "parcel_id": app_doc.get("parcel_ref", {}).get("parcel_number"),
        "assigned_surveyor_id": surveyor["_id"],
        "status": "assigned",
        "milestones": [{"type": "assigned", "at": now, "by": "system", "meta": {"reason": "zone+workload match"}}],
        "field_notes": [],
        "report_uploaded": False,
        "created_at": now,
    }

    await db.survey_tasks.insert_one(task)

    # Update surveyor workload
    await db.staff_members.update_one(
        {"_id": surveyor["_id"]},
        {"$inc": {"workload.active_tasks": 1}},
    )

    # Update application assignment
    await db.land_applications.update_one(
        {"_id": app_doc["_id"]},
        {"$set": {"assignment.assigned_surveyor_id": str(surveyor["_id"]), "timestamps.updated_at": now}},
    )

    await _log_event(db, app_doc["_id"], "survey_assigned", "system", "assignment_engine",
                     {"assigned_surveyor": surveyor.get("staff_code")})

    return {
        "message": "Surveyor assigned successfully",
        "surveyor": _format_staff(surveyor),
        "task_id": task["task_id"],
    }


async def add_survey_milestone(db: AsyncIOMotorDatabase, application_id: str, data: SurveyMilestoneCreate) -> dict:
    from app.services.application_service import _find_application

    app_doc = await _find_application(db, application_id)
    task = await db.survey_tasks.find_one({"application_id": app_doc["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="No survey task found for this application")

    now = utcnow()
    milestone = {
        "type": data.milestone_type,
        "at": now,
        "by": data.actor_id,
        "meta": {"notes": data.notes, "scheduled_date": data.scheduled_date},
    }

    await db.survey_tasks.update_one(
        {"_id": task["_id"]},
        {"$push": {"milestones": milestone}, "$set": {"status": data.milestone_type}},
    )

    # If survey completed, update application
    if data.milestone_type == "survey_completed":
        await db.land_applications.update_one(
            {"_id": app_doc["_id"]},
            {"$set": {"status": "surveyed", "timestamps.surveyed_at": now, "timestamps.updated_at": now}},
        )

    return {"message": f"Milestone '{data.milestone_type}' recorded", "milestone": serialize_doc(milestone)}


async def upload_survey_report(db: AsyncIOMotorDatabase, application_id: str, data: SurveyReportCreate) -> dict:
    from app.services.application_service import _find_application

    app_doc = await _find_application(db, application_id)
    task = await db.survey_tasks.find_one({"application_id": app_doc["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="No survey task found")

    now = utcnow()
    report = {
        "application_id": app_doc["_id"],
        "task_id": task.get("task_id"),
        "file_name": data.file_name,
        "file_size_kb": data.file_size_kb,
        "summary": data.summary,
        "findings": data.findings,
        "uploaded_by": data.uploaded_by,
        "uploaded_at": now,
        "registrar_reviewed": False,
    }

    result = await db.survey_reports.insert_one(report)
    await db.survey_tasks.update_one({"_id": task["_id"]}, {"$set": {"report_uploaded": True}})

    report["_id"] = str(result.inserted_id)
    return serialize_doc(report)


async def registrar_review(db: AsyncIOMotorDatabase, application_id: str, data: RegistrarReviewCreate) -> dict:
    from app.services.application_service import _find_application, _log_event

    app_doc = await _find_application(db, application_id)
    now = utcnow()

    await db.land_applications.update_one(
        {"_id": app_doc["_id"]},
        {
            "$set": {
                "assignment.assigned_registrar_id": data.reviewer_id,
                "timestamps.legal_review_at": now,
                "timestamps.updated_at": now,
            },
            "$push": {"internal.notes": f"[Registrar {data.reviewer_id}] {data.decision}: {data.notes}"},
        },
    )

    await _log_event(db, app_doc["_id"], "registrar_reviewed", "registrar", data.reviewer_id,
                     {"decision": data.decision, "notes": data.notes})

    return {"message": f"Registrar review recorded: {data.decision}", "decision": data.decision}


def _format_staff(doc: dict) -> dict:
    result = serialize_doc(doc)
    result["id"] = result.pop("_id", None)
    return result
