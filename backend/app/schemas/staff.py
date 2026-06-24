from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal

StaffRole = Literal["surveyor", "registrar", "admin"]

SurveyMilestoneType = Literal[
    "assigned",
    "visit_scheduled",
    "arrived_on_site",
    "survey_started",
    "survey_completed",
    "report_uploaded",
    "registrar_reviewed",
]


class ShiftCreate(BaseModel):
    day: Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    start: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end: str = Field(..., pattern=r"^\d{2}:\d{2}$")


class StaffCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    role: StaffRole
    department: Optional[str] = Field(None, max_length=100)
    skills: Optional[List[str]] = []
    zone_ids: Optional[List[str]] = []
    email: EmailStr
    phone: Optional[str] = None
    shifts: Optional[List[ShiftCreate]] = []
    max_tasks: int = Field(10, ge=1, le=50)


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    skills: Optional[List[str]] = None
    zone_ids: Optional[List[str]] = None
    max_tasks: Optional[int] = None
    active: Optional[bool] = None


class SurveyMilestoneCreate(BaseModel):
    milestone_type: SurveyMilestoneType
    notes: Optional[str] = Field(None, max_length=500)
    scheduled_date: Optional[str] = None
    actor_id: str = "system"


class SurveyReportCreate(BaseModel):
    file_name: str
    file_size_kb: Optional[float] = None
    summary: Optional[str] = Field(None, max_length=1000)
    findings: Optional[str] = Field(None, max_length=2000)
    uploaded_by: str


class RegistrarReviewCreate(BaseModel):
    decision: Literal["approved", "rejected", "needs_revision"]
    notes: str = Field(..., min_length=5, max_length=1000)
    reviewer_id: str
