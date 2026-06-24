from motor.motor_asyncio import AsyncIOMotorDatabase
from app.utils.helpers import serialize_doc
from datetime import datetime, timezone


async def get_kpis(db: AsyncIOMotorDatabase) -> dict:
    total = await db.land_applications.count_documents({})
    pending = await db.land_applications.count_documents({"status": {"$in": ["submitted", "pre_checked", "survey_required", "surveyed", "legal_review"]}})
    approved = await db.land_applications.count_documents({"status": "approved"})
    rejected = await db.land_applications.count_documents({"status": "rejected"})
    certs = await db.land_applications.count_documents({"status": "certificate_issued"})
    objections = await db.land_applications.count_documents({"status": "under_objection"})
    total_applicants = await db.applicants.count_documents({})
    total_staff = await db.staff_members.count_documents({"active": True})

    return {
        "total_applications": total,
        "pending_applications": pending,
        "approved_applications": approved,
        "rejected_applications": rejected,
        "certificates_issued": certs,
        "under_objection": objections,
        "total_applicants": total_applicants,
        "active_staff": total_staff,
    }


async def get_applications_by_status(db: AsyncIOMotorDatabase) -> list:
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"status": "$_id", "count": 1, "_id": 0}},
    ]
    result = await db.land_applications.aggregate(pipeline).to_list(length=20)
    return result


async def get_applications_by_zone(db: AsyncIOMotorDatabase) -> list:
    pipeline = [
        {"$group": {"_id": "$parcel_ref.zone_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"zone_id": "$_id", "count": 1, "_id": 0}},
    ]
    result = await db.land_applications.aggregate(pipeline).to_list(length=50)
    return result


async def get_applications_by_type(db: AsyncIOMotorDatabase) -> list:
    pipeline = [
        {"$group": {"_id": "$application_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"application_type": "$_id", "count": 1, "_id": 0}},
    ]
    result = await db.land_applications.aggregate(pipeline).to_list(length=20)
    return result


async def get_processing_time(db: AsyncIOMotorDatabase) -> list:
    pipeline = [
        {
            "$match": {
                "timestamps.submitted_at": {"$ne": None},
                "status": {"$in": ["approved", "closed", "certificate_issued"]},
            }
        },
        {
            "$project": {
                "application_type": 1,
                "processing_days": {
                    "$divide": [
                        {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
                        1000 * 60 * 60 * 24,
                    ]
                },
            }
        },
        {
            "$group": {
                "_id": "$application_type",
                "avg_days": {"$avg": "$processing_days"},
                "min_days": {"$min": "$processing_days"},
                "max_days": {"$max": "$processing_days"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"avg_days": -1}},
    ]
    result = await db.land_applications.aggregate(pipeline).to_list(length=20)
    return [serialize_doc(r) for r in result]


async def get_surveyor_workload(db: AsyncIOMotorDatabase) -> list:
    pipeline = [
        {"$match": {"role": "surveyor", "active": True}},
        {
            "$project": {
                "name": 1,
                "staff_code": 1,
                "active_tasks": "$workload.active_tasks",
                "max_tasks": "$workload.max_tasks",
                "utilization_pct": {
                    "$multiply": [
                        {"$divide": ["$workload.active_tasks", "$workload.max_tasks"]},
                        100,
                    ]
                },
                "zone_ids": "$coverage.zone_ids",
            }
        },
        {"$sort": {"active_tasks": -1}},
    ]
    result = await db.staff_members.aggregate(pipeline).to_list(length=50)
    return [serialize_doc(r) for r in result]


async def get_parcel_geofeed(db: AsyncIOMotorDatabase) -> dict:
    cursor = db.parcels.find({}, {"geometry": 1, "parcel_code": 1, "zone_id": 1, "registration_status": 1, "dispute_state": 1})
    parcels = await cursor.to_list(length=500)

    features = []
    for p in parcels:
        if p.get("geometry"):
            features.append({
                "type": "Feature",
                "geometry": p["geometry"],
                "properties": {
                    "id": str(p["_id"]),
                    "parcel_code": p.get("parcel_code"),
                    "zone_id": p.get("zone_id"),
                    "registration_status": p.get("registration_status"),
                    "dispute_state": p.get("dispute_state"),
                },
            })

    return {"type": "FeatureCollection", "features": features}


async def get_pending_heatmap(db: AsyncIOMotorDatabase) -> dict:
    pipeline = [
        {"$match": {"status": {"$in": ["submitted", "pre_checked", "survey_required", "under_objection"]}}},
        {"$match": {"parcel_ref.location": {"$ne": None}}},
        {"$project": {"location": "$parcel_ref.location", "status": 1, "priority": 1}},
    ]
    apps = await db.land_applications.aggregate(pipeline).to_list(length=500)

    features = []
    for a in apps:
        loc = a.get("location")
        if loc and loc.get("coordinates"):
            features.append({
                "type": "Feature",
                "geometry": loc,
                "properties": {
                    "status": a.get("status"),
                    "priority": a.get("priority"),
                    "weight": 3 if a.get("priority") == "urgent" else 1,
                },
            })

    return {"type": "FeatureCollection", "features": features}
