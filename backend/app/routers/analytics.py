from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics & Map"])


@router.get("/kpis", summary="Main KPIs dashboard")
async def get_kpis(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await analytics_service.get_kpis(db)


@router.get("/applications-by-status", summary="Applications grouped by status")
async def by_status(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await analytics_service.get_applications_by_status(db)


@router.get("/applications-by-zone", summary="Applications grouped by zone")
async def by_zone(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await analytics_service.get_applications_by_zone(db)


@router.get("/applications-by-type", summary="Applications grouped by type")
async def by_type(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await analytics_service.get_applications_by_type(db)


@router.get("/processing-time", summary="Average processing time by application type")
async def processing_time(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await analytics_service.get_processing_time(db)


@router.get("/surveyors", summary="Surveyor workload analytics")
async def surveyor_workload(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await analytics_service.get_surveyor_workload(db)


@router.get("/geofeeds/parcels", summary="Parcel GeoJSON feed for map")
async def parcel_geofeed(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await analytics_service.get_parcel_geofeed(db)


@router.get("/geofeeds/pending-heatmap", summary="Pending applications heatmap GeoJSON")
async def pending_heatmap(db: AsyncIOMotorDatabase = Depends(get_db)):
    return await analytics_service.get_pending_heatmap(db)
