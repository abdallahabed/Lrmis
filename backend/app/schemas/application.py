from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal, Any
from datetime import datetime


ApplicationType = Literal[
    "first_registration",
    "ownership_transfer",
    "parcel_subdivision",
    "parcel_merge",
    "boundary_correction",
    "certificate_request",
]

ApplicationStatus = Literal[
    "submitted",
    "pre_checked",
    "survey_required",
    "surveyed",
    "legal_review",
    "approved",
    "certificate_issued",
    "closed",
    "rejected",
    "on_hold",
    "missing_documents",
    "under_objection",
]

Priority = Literal["low", "normal", "high", "urgent"]


# ── Workflow State Machine ─────────────────────────────────────────
ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "submitted":          ["pre_checked", "missing_documents", "rejected"],
    "pre_checked":        ["survey_required", "legal_review", "missing_documents", "rejected"],
    "survey_required":    ["surveyed", "missing_documents", "on_hold", "rejected"],
    "surveyed":           ["legal_review", "missing_documents", "rejected"],
    "legal_review":       ["approved", "under_objection", "missing_documents", "rejected", "on_hold"],
    "approved":           ["certificate_issued", "on_hold"],
    "certificate_issued": ["closed"],
    "on_hold":            ["pre_checked", "survey_required", "legal_review", "rejected"],
    "missing_documents":  ["pre_checked", "survey_required", "legal_review", "rejected"],
    "under_objection":    ["legal_review", "rejected", "on_hold"],
    "rejected":           [],
    "closed":             [],
}

# ── Transition Rules ────────────────────────────────────────────────
TRANSITION_RULES = {
    "pre_checked": "Applicant and parcel information must be complete",
    "survey_required": "Parcel location (GeoJSON) must be valid",
    "surveyed": "A survey report must exist for this application",
    "legal_review": "Ownership documents must be uploaded and verified",
    "approved": "Legal review must be completed by registrar",
    "certificate_issued": "Application must be in approved state",
    "rejected": "A rejection reason must be provided",
}


# ── Sub-schemas ──────────────────────────────────────────────────────
class GeoJSONPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(..., min_length=2, max_length=2)

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, v):
        if len(v) != 2:
            raise ValueError("Coordinates must be [longitude, latitude]")
        lon, lat = v
        if not (-180 <= lon <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        if not (-90 <= lat <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v


class GeoJSONPolygon(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]]


class ParcelRef(BaseModel):
    parcel_number: str = Field(..., min_length=1, max_length=50)
    block_number: str = Field(..., min_length=1, max_length=50)
    basin_number: str = Field(..., min_length=1, max_length=50)
    zone_id: str = Field(..., min_length=1, max_length=50)
    location: Optional[GeoJSONPoint] = None


class RequiredDocument(BaseModel):
    document_type: str
    required: bool = True
    status: Literal["pending", "uploaded", "pending_review", "verified", "rejected"] = "pending"


# ── Create ───────────────────────────────────────────────────────────
class ApplicationCreate(BaseModel):
    application_type: ApplicationType
    applicant_id: str = Field(..., description="Applicant's MongoDB ObjectId string")
    parcel_ref: ParcelRef
    description: Optional[str] = Field(None, max_length=1000)
    priority: Priority = "normal"
    tags: Optional[List[str]] = []
    idempotency_key: Optional[str] = Field(None, max_length=100)
    submitted_by_representative: bool = False
    representative_id: Optional[str] = None


# ── Transition ────────────────────────────────────────────────────────
class TransitionRequest(BaseModel):
    target_state: ApplicationStatus
    reason: Optional[str] = Field(None, max_length=500)
    actor_id: Optional[str] = "system"
    actor_type: Optional[str] = "staff"


# ── Hold / Reject ─────────────────────────────────────────────────────
class HoldRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)
    actor_id: Optional[str] = "system"


class RejectRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=1000, description="Mandatory rejection reason")
    legal_basis: Optional[str] = Field(None, max_length=500)
    actor_id: Optional[str] = "system"


# ── Comment ───────────────────────────────────────────────────────────
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    author_id: str
    author_type: Literal["applicant", "staff", "registrar"] = "applicant"
    visibility: Literal["public", "staff_only"] = "public"


# ── Objection ─────────────────────────────────────────────────────────
class ObjectionCreate(BaseModel):
    applicant_id: str
    objection_reason: str = Field(..., min_length=20, max_length=2000)
    supporting_evidence: Optional[str] = Field(None, max_length=500)
    contact_info: Optional[str] = Field(None, max_length=200)


# ── Document Metadata ─────────────────────────────────────────────────
class DocumentCreate(BaseModel):
    document_type: str = Field(..., description="e.g. ownership_deed, id_copy, sale_contract")
    file_name: str = Field(..., max_length=255)
    file_size_kb: Optional[float] = None
    mime_type: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    uploaded_by: str


# ── Response ──────────────────────────────────────────────────────────
class ApplicationResponse(BaseModel):
    id: str
    application_id: str
    application_type: str
    status: str
    priority: str
    applicant_ref: dict
    parcel_ref: dict
    description: Optional[str]
    tags: List[str]
    workflow: dict
    required_documents: List[dict]
    timestamps: dict
    assignment: dict
    objection: dict
    internal: dict
    created_at: str

    class Config:
        from_attributes = True
