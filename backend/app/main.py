from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import connect_db, close_db
from app.routers import applicants, applications, staff, analytics
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    logger.info("LRMIS backend started")
    yield
    await close_db()
    logger.info("LRMIS backend stopped")


app = FastAPI(
    title="LRMIS - Land Registration Management Information System",
    description="""
## Land Registration Management Information System

A full workflow-driven, geospatial land registration platform.

### Modules
- **Applicant Portal** — Register, submit applications, track status, upload documents, file objections
- **Application Workflow** — Full state machine: submitted → pre_checked → survey_required → surveyed → legal_review → approved → certificate_issued → closed
- **Staff & Surveys** — Surveyor assignment, milestones, registrar review
- **Analytics & Map** — KPIs, aggregations, GeoJSON feeds
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(applicants.router)
app.include_router(applications.router)
app.include_router(staff.router)
app.include_router(analytics.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "system": "LRMIS",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
