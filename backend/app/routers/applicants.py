from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.schemas.applicant import ApplicantCreate, ApplicantUpdate
from app.services import applicant_service

router = APIRouter(prefix="/applicants", tags=["Applicants"])


@router.post("/", summary="Create applicant profile", status_code=201)
async def create_applicant(data: ApplicantCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await applicant_service.create_applicant(db, data)


@router.get("/", summary="List all applicants")
async def list_applicants(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    applicant_type: str = Query(None),
    verification_state: str = Query(None),
    search: str = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await applicant_service.list_applicants(db, page, limit, applicant_type, verification_state, search)


@router.get("/{applicant_id}", summary="Get applicant profile")
async def get_applicant(applicant_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await applicant_service.get_applicant(db, applicant_id)


@router.patch("/{applicant_id}", summary="Update applicant profile")
async def update_applicant(applicant_id: str, data: ApplicantUpdate, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await applicant_service.update_applicant(db, applicant_id, data)


@router.get("/{applicant_id}/applications", summary="Get all applications by this applicant")
async def get_applicant_applications(
    applicant_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await applicant_service.get_applicant_applications(db, applicant_id, page, limit)
