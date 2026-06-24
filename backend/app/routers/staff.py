from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.schemas.staff import StaffCreate, StaffUpdate, SurveyMilestoneCreate, SurveyReportCreate, RegistrarReviewCreate
from app.services import staff_service

router = APIRouter(tags=["Staff & Surveys"])


# ── Staff ─────────────────────────────────────────────────────────────
@router.post("/staff/", summary="Create surveyor or registrar staff account", status_code=201)
async def create_staff(data: StaffCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await staff_service.create_staff(db, data)


@router.get("/staff/", summary="List staff members")
async def list_staff(
    role: str = Query(None),
    active: bool = Query(True),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await staff_service.list_staff(db, role, active)


@router.get("/staff/{staff_id}", summary="Get staff profile with workload summary")
async def get_staff(staff_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await staff_service.get_staff(db, staff_id)


# ── Survey Assignment & Milestones ────────────────────────────────────
@router.post("/applications/{application_id}/auto-assign-surveyor", summary="Auto-assign surveyor")
async def auto_assign_surveyor(application_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await staff_service.auto_assign_surveyor(db, application_id)


@router.patch("/applications/{application_id}/survey-milestone", summary="Add survey milestone")
async def add_survey_milestone(
    application_id: str,
    data: SurveyMilestoneCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await staff_service.add_survey_milestone(db, application_id, data)


@router.post("/applications/{application_id}/survey-report", summary="Upload or register survey report metadata")
async def upload_survey_report(
    application_id: str,
    data: SurveyReportCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await staff_service.upload_survey_report(db, application_id, data)


@router.patch("/applications/{application_id}/registrar-review", summary="Registrar review decision")
async def registrar_review(
    application_id: str,
    data: RegistrarReviewCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await staff_service.registrar_review(db, application_id, data)
