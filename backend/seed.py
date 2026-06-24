"""
LRMIS Database Seed Script
===========================
Run this ONCE to populate your MongoDB database with realistic sample data.
This gives you working data so you can immediately test every feature.

HOW TO RUN:
    cd backend
    python seed.py

WHAT IT CREATES:
    - 4 applicants (citizen, lawyer, company, representative)
    - 3 staff members (2 surveyors, 1 registrar)
    - 5 parcels with GeoJSON boundaries
    - 6 land registration applications in different workflow states
    - Documents, survey tasks, objections, certificates, audit logs
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import random

# ── Configuration ─────────────────────────────────────────────────────
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "lrmis_db"


def utcnow():
    return datetime.now(timezone.utc)


def days_ago(n):
    """Returns a datetime N days in the past — used to create realistic timestamps."""
    return datetime.now(timezone.utc) - timedelta(days=n)


# ══════════════════════════════════════════════════════════════════════
# SAMPLE DATA DEFINITIONS
# ══════════════════════════════════════════════════════════════════════

# ── IDs ───────────────────────────────────────────────────────────────
# We define IDs manually so we can reference them across collections
# (e.g. an application can reference its applicant's ID)

APPLICANT_IDS = [ObjectId() for _ in range(4)]
STAFF_IDS = [ObjectId() for _ in range(3)]
PARCEL_IDS = [ObjectId() for _ in range(5)]
APP_IDS = [ObjectId() for _ in range(6)]


# ── APPLICANTS ────────────────────────────────────────────────────────
def make_applicants():
    return [
        # Applicant 1: Regular citizen
        {
            "_id": APPLICANT_IDS[0],
            "applicant_code": "APP-NR0001",
            "full_name": "Nour Ahmad",
            "applicant_type": "citizen",
            "verification_state": "verified",
            "identity": {
                "national_id": "400000001",
                "verified": True,
                "verification_method": "otp_stub",
                "verified_at": days_ago(60),
            },
            "contacts": {
                "email": "nour.ahmad@example.com",
                "phone": "+970599000001",
            },
            "address": {
                "city": "Ramallah",
                "neighborhood": "Al Tireh",
                "zone_id": "ZONE-RM-01",
                "street": "Street 5",
            },
            "preferences": {
                "preferred_contact": "email",
                "language": "ar",
                "notifications": {
                    "on_status_change": True,
                    "on_missing_documents": True,
                    "on_certificate_ready": True,
                    "on_objection_update": True,
                },
            },
            "privacy_settings": {
                "show_contact_to_staff": True,
                "show_address_to_staff": True,
            },
            "organization_name": None,
            "license_number": None,
            "stats": {
                "total_applications": 2,
                "approved_applications": 1,
                "pending_applications": 1,
                "rejected_applications": 0,
            },
            "linked_application_ids": [APP_IDS[0], APP_IDS[1]],
            "created_at": days_ago(60),
            "updated_at": days_ago(5),
        },

        # Applicant 2: Lawyer
        {
            "_id": APPLICANT_IDS[1],
            "applicant_code": "APP-KH0002",
            "full_name": "Khalid Hassan",
            "applicant_type": "lawyer",
            "verification_state": "verified",
            "identity": {
                "national_id": "400000002",
                "verified": True,
                "verification_method": "otp_stub",
                "verified_at": days_ago(90),
            },
            "contacts": {
                "email": "k.hassan.law@example.com",
                "phone": "+970599000002",
            },
            "address": {
                "city": "Ramallah",
                "neighborhood": "Al Masyoun",
                "zone_id": "ZONE-RM-02",
                "street": "Al Nuzha Street",
            },
            "preferences": {
                "preferred_contact": "email",
                "language": "ar",
                "notifications": {
                    "on_status_change": True,
                    "on_missing_documents": True,
                    "on_certificate_ready": True,
                    "on_objection_update": True,
                },
            },
            "privacy_settings": {"show_contact_to_staff": True, "show_address_to_staff": True},
            "organization_name": "Hassan Law Firm",
            "license_number": "LAW-2019-0442",
            "stats": {
                "total_applications": 2,
                "approved_applications": 0,
                "pending_applications": 1,
                "rejected_applications": 1,
            },
            "linked_application_ids": [APP_IDS[2], APP_IDS[3]],
            "created_at": days_ago(90),
            "updated_at": days_ago(10),
        },

        # Applicant 3: Company
        {
            "_id": APPLICANT_IDS[2],
            "applicant_code": "APP-PC0003",
            "full_name": "Palestine Construction Co.",
            "applicant_type": "company",
            "verification_state": "verified",
            "identity": {
                "national_id": "COM-2015-0099",
                "verified": True,
                "verification_method": "otp_stub",
                "verified_at": days_ago(120),
            },
            "contacts": {
                "email": "info@palcon.example.com",
                "phone": "+970599000003",
            },
            "address": {
                "city": "Ramallah",
                "neighborhood": "Al Bireh",
                "zone_id": "ZONE-RM-03",
                "street": "Industrial Zone A",
            },
            "preferences": {
                "preferred_contact": "email",
                "language": "en",
                "notifications": {
                    "on_status_change": True,
                    "on_missing_documents": True,
                    "on_certificate_ready": True,
                    "on_objection_update": False,
                },
            },
            "privacy_settings": {"show_contact_to_staff": True, "show_address_to_staff": True},
            "organization_name": "Palestine Construction Co.",
            "license_number": "COM-REG-2015-0099",
            "stats": {
                "total_applications": 1,
                "approved_applications": 0,
                "pending_applications": 1,
                "rejected_applications": 0,
            },
            "linked_application_ids": [APP_IDS[4]],
            "created_at": days_ago(120),
            "updated_at": days_ago(3),
        },

        # Applicant 4: Unverified citizen (new user)
        {
            "_id": APPLICANT_IDS[3],
            "applicant_code": "APP-SA0004",
            "full_name": "Sara Abdullah",
            "applicant_type": "citizen",
            "verification_state": "unverified",
            "identity": {
                "national_id": "400000004",
                "verified": False,
                "verification_method": None,
                "verified_at": None,
            },
            "contacts": {
                "email": "sara.abdullah@example.com",
                "phone": "+970599000004",
            },
            "address": {
                "city": "Ramallah",
                "neighborhood": "Beitunia",
                "zone_id": "ZONE-RM-01",
                "street": None,
            },
            "preferences": {
                "preferred_contact": "phone",
                "language": "ar",
                "notifications": {
                    "on_status_change": True,
                    "on_missing_documents": True,
                    "on_certificate_ready": True,
                    "on_objection_update": True,
                },
            },
            "privacy_settings": {"show_contact_to_staff": True, "show_address_to_staff": False},
            "organization_name": None,
            "license_number": None,
            "stats": {
                "total_applications": 1,
                "approved_applications": 0,
                "pending_applications": 1,
                "rejected_applications": 0,
            },
            "linked_application_ids": [APP_IDS[5]],
            "created_at": days_ago(2),
            "updated_at": days_ago(2),
        },
    ]


# ── STAFF MEMBERS ─────────────────────────────────────────────────────
def make_staff():
    return [
        # Staff 1: Surveyor covering Zone RM-01 and RM-02
        {
            "_id": STAFF_IDS[0],
            "staff_code": "SURV-RM-01",
            "name": "Survey Team Alpha",
            "role": "surveyor",
            "department": "Cadastral Survey",
            "skills": ["boundary_survey", "parcel_subdivision", "gps_mapping"],
            "coverage": {
                "zone_ids": ["ZONE-RM-01", "ZONE-RM-02"],
                "geo_fence": {
                    "type": "Polygon",
                    "coordinates": [[[35.19, 31.89], [35.22, 31.89], [35.22, 31.92], [35.19, 31.92], [35.19, 31.89]]],
                },
            },
            "schedule": {
                "timezone": "Asia/Jerusalem",
                "shifts": [
                    {"day": "Mon", "start": "08:00", "end": "16:00"},
                    {"day": "Tue", "start": "08:00", "end": "16:00"},
                    {"day": "Wed", "start": "08:00", "end": "16:00"},
                    {"day": "Thu", "start": "08:00", "end": "16:00"},
                ],
                "on_call": False,
            },
            "workload": {"active_tasks": 2, "max_tasks": 10},
            "contacts": {"phone": "+970599111001", "email": "survey.alpha@lrmis.example.com"},
            "active": True,
            "created_at": days_ago(180),
            "updated_at": days_ago(1),
        },

        # Staff 2: Surveyor covering Zone RM-03
        {
            "_id": STAFF_IDS[1],
            "staff_code": "SURV-RM-02",
            "name": "Survey Team Beta",
            "role": "surveyor",
            "department": "Cadastral Survey",
            "skills": ["parcel_merge", "boundary_survey", "aerial_mapping"],
            "coverage": {
                "zone_ids": ["ZONE-RM-03"],
                "geo_fence": {
                    "type": "Polygon",
                    "coordinates": [[[35.22, 31.89], [35.25, 31.89], [35.25, 31.92], [35.22, 31.92], [35.22, 31.89]]],
                },
            },
            "schedule": {
                "timezone": "Asia/Jerusalem",
                "shifts": [
                    {"day": "Mon", "start": "08:00", "end": "16:00"},
                    {"day": "Wed", "start": "08:00", "end": "16:00"},
                    {"day": "Sun", "start": "08:00", "end": "16:00"},
                ],
                "on_call": True,
            },
            "workload": {"active_tasks": 1, "max_tasks": 8},
            "contacts": {"phone": "+970599111002", "email": "survey.beta@lrmis.example.com"},
            "active": True,
            "created_at": days_ago(180),
            "updated_at": days_ago(2),
        },

        # Staff 3: Registrar
        {
            "_id": STAFF_IDS[2],
            "staff_code": "REG-RM-01",
            "name": "Ahmad Al-Registrar",
            "role": "registrar",
            "department": "Land Registration Authority",
            "skills": ["legal_review", "ownership_verification", "dispute_resolution"],
            "coverage": {
                "zone_ids": ["ZONE-RM-01", "ZONE-RM-02", "ZONE-RM-03"],
                "geo_fence": None,
            },
            "schedule": {
                "timezone": "Asia/Jerusalem",
                "shifts": [
                    {"day": "Mon", "start": "08:00", "end": "15:00"},
                    {"day": "Tue", "start": "08:00", "end": "15:00"},
                    {"day": "Wed", "start": "08:00", "end": "15:00"},
                    {"day": "Thu", "start": "08:00", "end": "15:00"},
                ],
                "on_call": False,
            },
            "workload": {"active_tasks": 3, "max_tasks": 15},
            "contacts": {"phone": "+970599111003", "email": "registrar.01@lrmis.example.com"},
            "active": True,
            "created_at": days_ago(365),
            "updated_at": days_ago(1),
        },
    ]


# ── PARCELS ───────────────────────────────────────────────────────────
def make_parcels():
    return [
        # Parcel 1: Registered, no dispute — belongs to Nour Ahmad
        {
            "_id": PARCEL_IDS[0],
            "parcel_code": "RM-Z01-B12-P145",
            "parcel_number": "145",
            "block_number": "12",
            "basin_number": "3",
            "zone_id": "ZONE-RM-01",
            "current_owner_refs": [{"applicant_id": APPLICANT_IDS[0], "share": "1/1"}],
            "area_sqm": 850.5,
            "land_use": "residential",
            "registration_status": "registered",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.2001, 31.9021], [35.2015, 31.9021], [35.2015, 31.9030], [35.2001, 31.9030], [35.2001, 31.9021]]],
            },
            "address_hint": "Ramallah - Al Tireh - Block 12",
            "dispute_state": "none",
            "created_at": days_ago(365),
            "updated_at": days_ago(20),
        },

        # Parcel 2: Registered, ownership transfer in progress
        {
            "_id": PARCEL_IDS[1],
            "parcel_code": "RM-Z01-B12-P146",
            "parcel_number": "146",
            "block_number": "12",
            "basin_number": "3",
            "zone_id": "ZONE-RM-01",
            "current_owner_refs": [{"applicant_id": APPLICANT_IDS[1], "share": "1/1"}],
            "area_sqm": 620.0,
            "land_use": "residential",
            "registration_status": "registered",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.2016, 31.9021], [35.2028, 31.9021], [35.2028, 31.9030], [35.2016, 31.9030], [35.2016, 31.9021]]],
            },
            "address_hint": "Ramallah - Al Tireh - Block 12",
            "dispute_state": "none",
            "created_at": days_ago(300),
            "updated_at": days_ago(15),
        },

        # Parcel 3: Disputed parcel
        {
            "_id": PARCEL_IDS[2],
            "parcel_code": "RM-Z02-B07-P088",
            "parcel_number": "88",
            "block_number": "7",
            "basin_number": "2",
            "zone_id": "ZONE-RM-02",
            "current_owner_refs": [{"applicant_id": APPLICANT_IDS[1], "share": "1/1"}],
            "area_sqm": 1200.0,
            "land_use": "commercial",
            "registration_status": "registered",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.2100, 31.9050], [35.2120, 31.9050], [35.2120, 31.9065], [35.2100, 31.9065], [35.2100, 31.9050]]],
            },
            "address_hint": "Ramallah - Al Masyoun - Block 7",
            "dispute_state": "boundary_dispute",
            "created_at": days_ago(500),
            "updated_at": days_ago(8),
        },

        # Parcel 4: Unregistered — first registration pending
        {
            "_id": PARCEL_IDS[3],
            "parcel_code": "RM-Z03-B05-P033",
            "parcel_number": "33",
            "block_number": "5",
            "basin_number": "1",
            "zone_id": "ZONE-RM-03",
            "current_owner_refs": [{"applicant_id": APPLICANT_IDS[2], "share": "1/1"}],
            "area_sqm": 3400.0,
            "land_use": "industrial",
            "registration_status": "pending",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.2300, 31.9100], [35.2340, 31.9100], [35.2340, 31.9130], [35.2300, 31.9130], [35.2300, 31.9100]]],
            },
            "address_hint": "Ramallah - Al Bireh - Industrial Zone",
            "dispute_state": "none",
            "created_at": days_ago(30),
            "updated_at": days_ago(3),
        },

        # Parcel 5: Small residential plot
        {
            "_id": PARCEL_IDS[4],
            "parcel_code": "RM-Z01-B12-P147",
            "parcel_number": "147",
            "block_number": "12",
            "basin_number": "3",
            "zone_id": "ZONE-RM-01",
            "current_owner_refs": [{"applicant_id": APPLICANT_IDS[3], "share": "1/1"}],
            "area_sqm": 400.0,
            "land_use": "residential",
            "registration_status": "pending",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[35.2029, 31.9021], [35.2040, 31.9021], [35.2040, 31.9030], [35.2029, 31.9030], [35.2029, 31.9021]]],
            },
            "address_hint": "Ramallah - Beitunia - Block 12",
            "dispute_state": "none",
            "created_at": days_ago(2),
            "updated_at": days_ago(2),
        },
    ]


# ── LAND APPLICATIONS ─────────────────────────────────────────────────
def make_applications():
    return [
        # App 1: APPROVED — Nour Ahmad's ownership transfer (fully completed workflow)
        {
            "_id": APP_IDS[0],
            "application_id": "LRMIS-2026-0001",
            "application_type": "ownership_transfer",
            "status": "approved",
            "priority": "normal",
            "idempotency_key": "idem-app-0001",
            "applicant_ref": {
                "applicant_id": APPLICANT_IDS[0],
                "applicant_type": "citizen",
                "full_name": "Nour Ahmad",
                "submitted_by_representative": False,
                "representative_id": None,
            },
            "parcel_ref": {
                "parcel_id": PARCEL_IDS[0],
                "parcel_number": "145",
                "block_number": "12",
                "basin_number": "3",
                "zone_id": "ZONE-RM-01",
                "location": {"type": "Point", "coordinates": [35.2008, 31.9025]},
            },
            "description": "Ownership transfer of parcel 145, block 12 from previous owner to Nour Ahmad.",
            "tags": ["ownership_transfer", "completed"],
            "workflow": {
                "current_state": "approved",
                "allowed_next": ["certificate_issued", "on_hold"],
                "transition_rules_version": "v1.0",
            },
            "required_documents": [
                {"document_type": "ownership_deed", "required": True, "status": "verified"},
                {"document_type": "id_copy",        "required": True, "status": "verified"},
                {"document_type": "sale_contract",  "required": True, "status": "verified"},
            ],
            "timestamps": {
                "submitted_at":        days_ago(45),
                "pre_checked_at":      days_ago(44),
                "survey_required_at":  days_ago(43),
                "surveyed_at":         days_ago(38),
                "legal_review_at":     days_ago(30),
                "approved_at":         days_ago(20),
                "certificate_issued_at": None,
                "closed_at":           None,
                "updated_at":          days_ago(20),
            },
            "assignment": {
                "assigned_surveyor_id": str(STAFF_IDS[0]),
                "assigned_registrar_id": str(STAFF_IDS[2]),
                "assignment_policy": "zone+workload+availability",
            },
            "objection": {"has_objection": False, "objection_ids": []},
            "internal": {
                "notes": [
                    "Pre-check completed. All applicant info verified.",
                    "Survey completed by Team Alpha. Boundaries confirmed.",
                    "Legal review passed. Ownership chain is clean.",
                ],
                "visibility": "staff_only",
                "rejection_reason": None,
                "hold_reason": None,
            },
            "certificate_id": None,
            "comments": [],
            "created_at": days_ago(45),
            "updated_at": days_ago(20),
        },

        # App 2: SURVEY_REQUIRED — Nour Ahmad's second application
        {
            "_id": APP_IDS[1],
            "application_id": "LRMIS-2026-0002",
            "application_type": "boundary_correction",
            "status": "survey_required",
            "priority": "high",
            "idempotency_key": "idem-app-0002",
            "applicant_ref": {
                "applicant_id": APPLICANT_IDS[0],
                "applicant_type": "citizen",
                "full_name": "Nour Ahmad",
                "submitted_by_representative": False,
                "representative_id": None,
            },
            "parcel_ref": {
                "parcel_id": PARCEL_IDS[0],
                "parcel_number": "145",
                "block_number": "12",
                "basin_number": "3",
                "zone_id": "ZONE-RM-01",
                "location": {"type": "Point", "coordinates": [35.2009, 31.9026]},
            },
            "description": "Minor boundary correction needed on east side of parcel 145.",
            "tags": ["boundary_correction", "high_priority"],
            "workflow": {
                "current_state": "survey_required",
                "allowed_next": ["surveyed", "missing_documents", "on_hold", "rejected"],
                "transition_rules_version": "v1.0",
            },
            "required_documents": [
                {"document_type": "ownership_deed", "required": True, "status": "verified"},
                {"document_type": "id_copy",        "required": True, "status": "verified"},
                {"document_type": "boundary_survey","required": True, "status": "pending"},
            ],
            "timestamps": {
                "submitted_at":        days_ago(10),
                "pre_checked_at":      days_ago(9),
                "survey_required_at":  days_ago(8),
                "surveyed_at":         None,
                "legal_review_at":     None,
                "approved_at":         None,
                "certificate_issued_at": None,
                "closed_at":           None,
                "updated_at":          days_ago(8),
            },
            "assignment": {
                "assigned_surveyor_id": str(STAFF_IDS[0]),
                "assigned_registrar_id": str(STAFF_IDS[2]),
                "assignment_policy": "zone+workload+availability",
            },
            "objection": {"has_objection": False, "objection_ids": []},
            "internal": {
                "notes": ["Pre-check done. Survey team assigned. Waiting for field visit."],
                "visibility": "staff_only",
                "rejection_reason": None,
                "hold_reason": None,
            },
            "certificate_id": None,
            "comments": [],
            "created_at": days_ago(10),
            "updated_at": days_ago(8),
        },

        # App 3: LEGAL_REVIEW — Lawyer's application
        {
            "_id": APP_IDS[2],
            "application_id": "LRMIS-2026-0003",
            "application_type": "ownership_transfer",
            "status": "legal_review",
            "priority": "normal",
            "idempotency_key": "idem-app-0003",
            "applicant_ref": {
                "applicant_id": APPLICANT_IDS[1],
                "applicant_type": "lawyer",
                "full_name": "Khalid Hassan",
                "submitted_by_representative": False,
                "representative_id": None,
            },
            "parcel_ref": {
                "parcel_id": PARCEL_IDS[1],
                "parcel_number": "146",
                "block_number": "12",
                "basin_number": "3",
                "zone_id": "ZONE-RM-01",
                "location": {"type": "Point", "coordinates": [35.2022, 31.9025]},
            },
            "description": "Transfer of commercial property on behalf of client. All documents attached.",
            "tags": ["ownership_transfer", "lawyer_submitted"],
            "workflow": {
                "current_state": "legal_review",
                "allowed_next": ["approved", "under_objection", "missing_documents", "rejected", "on_hold"],
                "transition_rules_version": "v1.0",
            },
            "required_documents": [
                {"document_type": "ownership_deed", "required": True, "status": "verified"},
                {"document_type": "id_copy",        "required": True, "status": "verified"},
                {"document_type": "sale_contract",  "required": True, "status": "pending_review"},
            ],
            "timestamps": {
                "submitted_at":        days_ago(20),
                "pre_checked_at":      days_ago(19),
                "survey_required_at":  days_ago(18),
                "surveyed_at":         days_ago(14),
                "legal_review_at":     days_ago(7),
                "approved_at":         None,
                "certificate_issued_at": None,
                "closed_at":           None,
                "updated_at":          days_ago(7),
            },
            "assignment": {
                "assigned_surveyor_id": str(STAFF_IDS[0]),
                "assigned_registrar_id": str(STAFF_IDS[2]),
                "assignment_policy": "zone+workload+availability",
            },
            "objection": {"has_objection": False, "objection_ids": []},
            "internal": {
                "notes": ["Survey completed. Awaiting registrar legal review. Sale contract under review."],
                "visibility": "staff_only",
                "rejection_reason": None,
                "hold_reason": None,
            },
            "certificate_id": None,
            "comments": [
                {
                    "content": "All required documents have been submitted. Please expedite the review.",
                    "author_id": str(APPLICANT_IDS[1]),
                    "author_type": "applicant",
                    "visibility": "public",
                    "created_at": days_ago(6),
                }
            ],
            "created_at": days_ago(20),
            "updated_at": days_ago(6),
        },

        # App 4: REJECTED — Khalid's disputed parcel application
        {
            "_id": APP_IDS[3],
            "application_id": "LRMIS-2026-0004",
            "application_type": "ownership_transfer",
            "status": "rejected",
            "priority": "normal",
            "idempotency_key": "idem-app-0004",
            "applicant_ref": {
                "applicant_id": APPLICANT_IDS[1],
                "applicant_type": "lawyer",
                "full_name": "Khalid Hassan",
                "submitted_by_representative": False,
                "representative_id": None,
            },
            "parcel_ref": {
                "parcel_id": PARCEL_IDS[2],
                "parcel_number": "88",
                "block_number": "7",
                "basin_number": "2",
                "zone_id": "ZONE-RM-02",
                "location": {"type": "Point", "coordinates": [35.2110, 31.9057]},
            },
            "description": "Transfer application for parcel 88, block 7.",
            "tags": ["rejected", "disputed_parcel"],
            "workflow": {
                "current_state": "rejected",
                "allowed_next": [],
                "transition_rules_version": "v1.0",
            },
            "required_documents": [
                {"document_type": "ownership_deed", "required": True, "status": "verified"},
                {"document_type": "id_copy",        "required": True, "status": "verified"},
                {"document_type": "sale_contract",  "required": True, "status": "rejected"},
            ],
            "timestamps": {
                "submitted_at":        days_ago(60),
                "pre_checked_at":      days_ago(59),
                "survey_required_at":  days_ago(58),
                "surveyed_at":         days_ago(50),
                "legal_review_at":     days_ago(40),
                "approved_at":         None,
                "certificate_issued_at": None,
                "closed_at":           None,
                "updated_at":          days_ago(35),
            },
            "assignment": {
                "assigned_surveyor_id": str(STAFF_IDS[0]),
                "assigned_registrar_id": str(STAFF_IDS[2]),
                "assignment_policy": "zone+workload+availability",
            },
            "objection": {"has_objection": False, "objection_ids": []},
            "internal": {
                "notes": ["Rejected: ownership chain cannot be verified. Sale contract is invalid."],
                "visibility": "staff_only",
                "rejection_reason": "Ownership chain cannot be verified. The provided sale contract has discrepancies with registered ownership records. Legal basis: Land Registration Law Article 15.",
                "hold_reason": None,
                "legal_basis": "Land Registration Law Article 15",
            },
            "certificate_id": None,
            "comments": [],
            "created_at": days_ago(60),
            "updated_at": days_ago(35),
        },

        # App 5: UNDER OBJECTION — Company's first registration
        {
            "_id": APP_IDS[4],
            "application_id": "LRMIS-2026-0005",
            "application_type": "first_registration",
            "status": "under_objection",
            "priority": "urgent",
            "idempotency_key": "idem-app-0005",
            "applicant_ref": {
                "applicant_id": APPLICANT_IDS[2],
                "applicant_type": "company",
                "full_name": "Palestine Construction Co.",
                "submitted_by_representative": False,
                "representative_id": None,
            },
            "parcel_ref": {
                "parcel_id": PARCEL_IDS[3],
                "parcel_number": "33",
                "block_number": "5",
                "basin_number": "1",
                "zone_id": "ZONE-RM-03",
                "location": {"type": "Point", "coordinates": [35.2320, 31.9115]},
            },
            "description": "First registration for industrial land parcel in Al Bireh zone.",
            "tags": ["first_registration", "industrial", "objection_filed"],
            "workflow": {
                "current_state": "under_objection",
                "allowed_next": ["legal_review", "rejected", "on_hold"],
                "transition_rules_version": "v1.0",
            },
            "required_documents": [
                {"document_type": "ownership_deed", "required": True, "status": "pending_review"},
                {"document_type": "id_copy",        "required": True, "status": "verified"},
                {"document_type": "survey_plan",    "required": True, "status": "verified"},
            ],
            "timestamps": {
                "submitted_at":        days_ago(30),
                "pre_checked_at":      days_ago(29),
                "survey_required_at":  days_ago(28),
                "surveyed_at":         days_ago(20),
                "legal_review_at":     None,
                "approved_at":         None,
                "certificate_issued_at": None,
                "closed_at":           None,
                "updated_at":          days_ago(3),
            },
            "assignment": {
                "assigned_surveyor_id": str(STAFF_IDS[1]),
                "assigned_registrar_id": str(STAFF_IDS[2]),
                "assignment_policy": "zone+workload+availability",
            },
            "objection": {"has_objection": True, "objection_ids": []},  # Will be filled after objection insert
            "internal": {
                "notes": ["Survey done. Objection filed by adjacent landowner. Paused pending review."],
                "visibility": "staff_only",
                "rejection_reason": None,
                "hold_reason": None,
            },
            "certificate_id": None,
            "comments": [],
            "created_at": days_ago(30),
            "updated_at": days_ago(3),
        },

        # App 6: SUBMITTED — Sara's new application (just came in)
        {
            "_id": APP_IDS[5],
            "application_id": "LRMIS-2026-0006",
            "application_type": "certificate_request",
            "status": "submitted",
            "priority": "low",
            "idempotency_key": "idem-app-0006",
            "applicant_ref": {
                "applicant_id": APPLICANT_IDS[3],
                "applicant_type": "citizen",
                "full_name": "Sara Abdullah",
                "submitted_by_representative": False,
                "representative_id": None,
            },
            "parcel_ref": {
                "parcel_id": PARCEL_IDS[4],
                "parcel_number": "147",
                "block_number": "12",
                "basin_number": "3",
                "zone_id": "ZONE-RM-01",
                "location": {"type": "Point", "coordinates": [35.2034, 31.9025]},
            },
            "description": "Requesting a new land certificate for parcel 147.",
            "tags": ["certificate_request", "new_submission"],
            "workflow": {
                "current_state": "submitted",
                "allowed_next": ["pre_checked", "missing_documents", "rejected"],
                "transition_rules_version": "v1.0",
            },
            "required_documents": [
                {"document_type": "id_copy",              "required": True, "status": "pending"},
                {"document_type": "previous_certificate", "required": True, "status": "pending"},
            ],
            "timestamps": {
                "submitted_at":        days_ago(1),
                "pre_checked_at":      None,
                "survey_required_at":  None,
                "surveyed_at":         None,
                "legal_review_at":     None,
                "approved_at":         None,
                "certificate_issued_at": None,
                "closed_at":           None,
                "updated_at":          days_ago(1),
            },
            "assignment": {
                "assigned_surveyor_id": None,
                "assigned_registrar_id": None,
                "assignment_policy": "zone+workload+availability",
            },
            "objection": {"has_objection": False, "objection_ids": []},
            "internal": {
                "notes": [],
                "visibility": "staff_only",
                "rejection_reason": None,
                "hold_reason": None,
            },
            "certificate_id": None,
            "comments": [],
            "created_at": days_ago(1),
            "updated_at": days_ago(1),
        },
    ]


# ── SURVEY TASKS ──────────────────────────────────────────────────────
def make_survey_tasks():
    return [
        # Task for App 1 (approved) — fully completed
        {
            "task_id": "SURV-2026-0001",
            "application_id": APP_IDS[0],
            "parcel_id": PARCEL_IDS[0],
            "assigned_surveyor_id": STAFF_IDS[0],
            "status": "registrar_reviewed",
            "milestones": [
                {"type": "assigned",        "at": days_ago(43), "by": "system",          "meta": {"reason": "zone+workload match"}},
                {"type": "visit_scheduled", "at": days_ago(42), "by": str(STAFF_IDS[0]), "meta": {"scheduled_date": str((utcnow() - timedelta(days=40)).date())}},
                {"type": "arrived_on_site", "at": days_ago(40), "by": str(STAFF_IDS[0]), "meta": {}},
                {"type": "survey_started",  "at": days_ago(40), "by": str(STAFF_IDS[0]), "meta": {}},
                {"type": "survey_completed","at": days_ago(39), "by": str(STAFF_IDS[0]), "meta": {}},
                {"type": "report_uploaded", "at": days_ago(38), "by": str(STAFF_IDS[0]), "meta": {"report": "SURV-RPT-0001"}},
                {"type": "registrar_reviewed","at": days_ago(30), "by": str(STAFF_IDS[2]),"meta": {"decision": "approved"}},
            ],
            "field_notes": ["Boundaries confirmed with GPS. No encroachments found.", "Area measured: 850.5 sqm. Matches records."],
            "report_uploaded": True,
            "created_at": days_ago(43),
        },

        # Task for App 2 (survey_required) — in progress
        {
            "task_id": "SURV-2026-0002",
            "application_id": APP_IDS[1],
            "parcel_id": PARCEL_IDS[0],
            "assigned_surveyor_id": STAFF_IDS[0],
            "status": "visit_scheduled",
            "milestones": [
                {"type": "assigned",        "at": days_ago(8), "by": "system",          "meta": {"reason": "zone+workload match"}},
                {"type": "visit_scheduled", "at": days_ago(7), "by": str(STAFF_IDS[0]), "meta": {"scheduled_date": str((utcnow() + timedelta(days=2)).date())}},
            ],
            "field_notes": [],
            "report_uploaded": False,
            "created_at": days_ago(8),
        },

        # Task for App 3 (legal_review) — survey done
        {
            "task_id": "SURV-2026-0003",
            "application_id": APP_IDS[2],
            "parcel_id": PARCEL_IDS[1],
            "assigned_surveyor_id": STAFF_IDS[0],
            "status": "report_uploaded",
            "milestones": [
                {"type": "assigned",        "at": days_ago(18), "by": "system",          "meta": {}},
                {"type": "visit_scheduled", "at": days_ago(17), "by": str(STAFF_IDS[0]), "meta": {}},
                {"type": "arrived_on_site", "at": days_ago(15), "by": str(STAFF_IDS[0]), "meta": {}},
                {"type": "survey_started",  "at": days_ago(15), "by": str(STAFF_IDS[0]), "meta": {}},
                {"type": "survey_completed","at": days_ago(14), "by": str(STAFF_IDS[0]), "meta": {}},
                {"type": "report_uploaded", "at": days_ago(14), "by": str(STAFF_IDS[0]), "meta": {}},
            ],
            "field_notes": ["All boundaries verified. Parcel dimensions match registered records."],
            "report_uploaded": True,
            "created_at": days_ago(18),
        },

        # Task for App 5 (under_objection) — survey done, objection paused it
        {
            "task_id": "SURV-2026-0004",
            "application_id": APP_IDS[4],
            "parcel_id": PARCEL_IDS[3],
            "assigned_surveyor_id": STAFF_IDS[1],
            "status": "survey_completed",
            "milestones": [
                {"type": "assigned",        "at": days_ago(28), "by": "system",          "meta": {}},
                {"type": "visit_scheduled", "at": days_ago(27), "by": str(STAFF_IDS[1]), "meta": {}},
                {"type": "arrived_on_site", "at": days_ago(22), "by": str(STAFF_IDS[1]), "meta": {}},
                {"type": "survey_started",  "at": days_ago(22), "by": str(STAFF_IDS[1]), "meta": {}},
                {"type": "survey_completed","at": days_ago(20), "by": str(STAFF_IDS[1]), "meta": {}},
            ],
            "field_notes": ["Large industrial plot. Boundaries surveyed. Adjacent landowner may dispute east boundary."],
            "report_uploaded": False,
            "created_at": days_ago(28),
        },
    ]


# ── APPLICATION DOCUMENTS ─────────────────────────────────────────────
def make_documents():
    return [
        {"application_id": APP_IDS[0], "document_type": "ownership_deed",  "file_name": "ownership_deed_145.pdf",  "file_size_kb": 245.5, "mime_type": "application/pdf", "uploaded_by": "Nour Ahmad",  "review_status": "verified",       "uploaded_at": days_ago(44)},
        {"application_id": APP_IDS[0], "document_type": "id_copy",         "file_name": "national_id_nour.pdf",    "file_size_kb": 120.0, "mime_type": "application/pdf", "uploaded_by": "Nour Ahmad",  "review_status": "verified",       "uploaded_at": days_ago(44)},
        {"application_id": APP_IDS[0], "document_type": "sale_contract",   "file_name": "sale_contract_145.pdf",   "file_size_kb": 380.0, "mime_type": "application/pdf", "uploaded_by": "Nour Ahmad",  "review_status": "verified",       "uploaded_at": days_ago(44)},
        {"application_id": APP_IDS[1], "document_type": "ownership_deed",  "file_name": "deed_145_copy.pdf",       "file_size_kb": 245.5, "mime_type": "application/pdf", "uploaded_by": "Nour Ahmad",  "review_status": "verified",       "uploaded_at": days_ago(9)},
        {"application_id": APP_IDS[1], "document_type": "id_copy",         "file_name": "id_nour_2.pdf",           "file_size_kb": 120.0, "mime_type": "application/pdf", "uploaded_by": "Nour Ahmad",  "review_status": "verified",       "uploaded_at": days_ago(9)},
        {"application_id": APP_IDS[2], "document_type": "ownership_deed",  "file_name": "deed_146.pdf",            "file_size_kb": 310.0, "mime_type": "application/pdf", "uploaded_by": "Khalid Hassan","review_status": "verified",       "uploaded_at": days_ago(19)},
        {"application_id": APP_IDS[2], "document_type": "id_copy",         "file_name": "lawyer_id.pdf",           "file_size_kb": 95.0,  "mime_type": "application/pdf", "uploaded_by": "Khalid Hassan","review_status": "verified",       "uploaded_at": days_ago(19)},
        {"application_id": APP_IDS[2], "document_type": "sale_contract",   "file_name": "sale_contract_146.pdf",   "file_size_kb": 420.0, "mime_type": "application/pdf", "uploaded_by": "Khalid Hassan","review_status": "pending_review", "uploaded_at": days_ago(18)},
        {"application_id": APP_IDS[4], "document_type": "id_copy",         "file_name": "palcon_registration.pdf", "file_size_kb": 200.0, "mime_type": "application/pdf", "uploaded_by": "Palestine Construction Co.","review_status": "verified","uploaded_at": days_ago(29)},
        {"application_id": APP_IDS[4], "document_type": "survey_plan",     "file_name": "survey_plan_zone3.pdf",   "file_size_kb": 550.0, "mime_type": "application/pdf", "uploaded_by": "Palestine Construction Co.","review_status": "verified","uploaded_at": days_ago(29)},
    ]


# ── SURVEY REPORTS ────────────────────────────────────────────────────
def make_survey_reports():
    return [
        {
            "application_id": APP_IDS[0],
            "task_id": "SURV-2026-0001",
            "file_name": "survey_report_app0001.pdf",
            "file_size_kb": 780.0,
            "summary": "Boundary survey completed. All measurements confirmed.",
            "findings": "Parcel 145 boundaries are clear. Area: 850.5 sqm confirmed. No encroachments from neighboring parcels. GPS coordinates recorded.",
            "uploaded_by": str(STAFF_IDS[0]),
            "uploaded_at": days_ago(38),
            "registrar_reviewed": True,
        },
        {
            "application_id": APP_IDS[2],
            "task_id": "SURV-2026-0003",
            "file_name": "survey_report_app0003.pdf",
            "file_size_kb": 640.0,
            "summary": "Ownership transfer survey completed successfully.",
            "findings": "Parcel 146 verified. Area: 620.0 sqm. Boundaries match registered records. Ready for legal review.",
            "uploaded_by": str(STAFF_IDS[0]),
            "uploaded_at": days_ago(14),
            "registrar_reviewed": False,
        },
    ]


# ── OBJECTIONS ────────────────────────────────────────────────────────
def make_objections():
    return [
        {
            "application_id": APP_IDS[4],
            "application_ref": "LRMIS-2026-0005",
            "applicant_id": str(APPLICANT_IDS[1]),  # Khalid (neighbor) filed the objection
            "objection_reason": "The eastern boundary of the claimed parcel 33 encroaches on my registered land parcel 88 by approximately 12 meters. I have GPS evidence and a court-registered survey from 2019 proving the correct boundary location. This registration should not proceed until the boundary dispute is formally resolved.",
            "supporting_evidence": "GPS survey 2019, Court case RM-2019-0044, Previous registration deed",
            "contact_info": "+970599000002 / k.hassan.law@example.com",
            "status": "pending",
            "submitted_at": days_ago(3),
            "resolved_at": None,
            "resolution_notes": None,
        }
    ]


# ── CERTIFICATES ──────────────────────────────────────────────────────
def make_certificates():
    # Only App 1 is approved — but we'll leave certificate for you to generate via the API
    # This shows what a certificate looks like once issued
    return []  # Empty — generate via POST /applications/LRMIS-2026-0001/certificate


# ── PERFORMANCE LOGS ──────────────────────────────────────────────────
def make_performance_logs():
    return [
        # Log for App 1 (complete journey)
        {
            "application_id": APP_IDS[0],
            "event_stream": [
                {"type": "submitted",        "by": {"actor_type": "applicant", "actor_id": str(APPLICANT_IDS[0])}, "at": days_ago(45), "meta": {"channel": "web"}},
                {"type": "pre_checked",      "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(44), "meta": {"missing_documents": 0}},
                {"type": "survey_required",  "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(43), "meta": {}},
                {"type": "survey_assigned",  "by": {"actor_type": "system",    "actor_id": "assignment_engine"},  "at": days_ago(43), "meta": {"assigned_surveyor": "SURV-RM-01"}},
                {"type": "document_uploaded","by": {"actor_type": "applicant", "actor_id": str(APPLICANT_IDS[0])},"at": days_ago(44), "meta": {"document_type": "ownership_deed"}},
                {"type": "surveyed",         "by": {"actor_type": "surveyor",  "actor_id": str(STAFF_IDS[0])},    "at": days_ago(38), "meta": {}},
                {"type": "legal_review",     "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(30), "meta": {}},
                {"type": "approved",         "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(20), "meta": {}},
            ],
            "computed_kpis": {
                "processing_days": 25,
                "precheck_minutes": 60 * 24,
                "survey_delay_days": 5,
                "certificate_issued": False,
            },
            "created_at": days_ago(45),
        },

        # Log for App 2 (in progress)
        {
            "application_id": APP_IDS[1],
            "event_stream": [
                {"type": "submitted",       "by": {"actor_type": "applicant", "actor_id": str(APPLICANT_IDS[0])}, "at": days_ago(10), "meta": {"channel": "web"}},
                {"type": "pre_checked",     "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(9),  "meta": {}},
                {"type": "survey_required", "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(8),  "meta": {}},
                {"type": "survey_assigned", "by": {"actor_type": "system",    "actor_id": "assignment_engine"},  "at": days_ago(8),  "meta": {"assigned_surveyor": "SURV-RM-01"}},
            ],
            "computed_kpis": {"processing_days": None, "precheck_minutes": 60 * 24, "survey_delay_days": None, "certificate_issued": False},
            "created_at": days_ago(10),
        },

        # Log for App 5 (objection)
        {
            "application_id": APP_IDS[4],
            "event_stream": [
                {"type": "submitted",       "by": {"actor_type": "applicant", "actor_id": str(APPLICANT_IDS[2])}, "at": days_ago(30), "meta": {}},
                {"type": "pre_checked",     "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(29), "meta": {}},
                {"type": "survey_required", "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(28), "meta": {}},
                {"type": "surveyed",        "by": {"actor_type": "surveyor",  "actor_id": str(STAFF_IDS[1])},    "at": days_ago(20), "meta": {}},
                {"type": "under_objection", "by": {"actor_type": "applicant", "actor_id": str(APPLICANT_IDS[1])},"at": days_ago(3),  "meta": {"objection_filed_by": str(APPLICANT_IDS[1])}},
            ],
            "computed_kpis": {"processing_days": None, "precheck_minutes": 60 * 24, "survey_delay_days": 8, "certificate_issued": False},
            "created_at": days_ago(30),
        },

        # Logs for remaining apps
        {
            "application_id": APP_IDS[2],
            "event_stream": [
                {"type": "submitted",       "by": {"actor_type": "applicant", "actor_id": str(APPLICANT_IDS[1])}, "at": days_ago(20), "meta": {}},
                {"type": "pre_checked",     "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(19), "meta": {}},
                {"type": "survey_required", "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(18), "meta": {}},
                {"type": "surveyed",        "by": {"actor_type": "surveyor",  "actor_id": str(STAFF_IDS[0])},    "at": days_ago(14), "meta": {}},
                {"type": "legal_review",    "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(7),  "meta": {}},
            ],
            "computed_kpis": {"processing_days": None, "precheck_minutes": 60 * 24, "survey_delay_days": 4, "certificate_issued": False},
            "created_at": days_ago(20),
        },
        {
            "application_id": APP_IDS[3],
            "event_stream": [
                {"type": "submitted",   "by": {"actor_type": "applicant", "actor_id": str(APPLICANT_IDS[1])}, "at": days_ago(60), "meta": {}},
                {"type": "pre_checked", "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(59), "meta": {}},
                {"type": "rejected",    "by": {"actor_type": "registrar", "actor_id": str(STAFF_IDS[2])},    "at": days_ago(35), "meta": {"reason": "Ownership chain cannot be verified"}},
            ],
            "computed_kpis": {"processing_days": None, "precheck_minutes": 60 * 24, "survey_delay_days": None, "certificate_issued": False},
            "created_at": days_ago(60),
        },
        {
            "application_id": APP_IDS[5],
            "event_stream": [
                {"type": "submitted", "by": {"actor_type": "applicant", "actor_id": str(APPLICANT_IDS[3])}, "at": days_ago(1), "meta": {"channel": "web"}},
            ],
            "computed_kpis": {"processing_days": None, "precheck_minutes": None, "survey_delay_days": None, "certificate_issued": False},
            "created_at": days_ago(1),
        },
    ]


# ══════════════════════════════════════════════════════════════════════
# MAIN SEED FUNCTION
# ══════════════════════════════════════════════════════════════════════

async def seed():
    print("\n" + "="*55)
    print("  LRMIS Database Seed Script")
    print("="*55)

    # Connect to MongoDB
    print(f"\n🔌 Connecting to MongoDB at {MONGODB_URL}...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]

    try:
        # Test connection
        await client.admin.command('ping')
        print(f"✅ Connected to MongoDB — database: {DATABASE_NAME}")
    except Exception as e:
        print(f"❌ Could not connect to MongoDB: {e}")
        print("   Make sure MongoDB is running on localhost:27017")
        return

    # ── Ask before wiping ─────────────────────────────────────────────
    print("\n⚠️  This will DELETE all existing data and re-seed fresh data.")
    answer = input("   Type 'yes' to continue, anything else to cancel: ").strip().lower()
    if answer != 'yes':
        print("   Cancelled. No changes made.")
        return

    # ── Drop all collections ──────────────────────────────────────────
    print("\n🗑️  Clearing existing data...")
    collections = [
        "applicants", "land_applications", "staff_members", "parcels",
        "survey_tasks", "survey_reports", "application_documents",
        "objections", "certificates", "performance_logs",
    ]
    for col in collections:
        await db[col].drop()
        print(f"   Dropped: {col}")

    # ── Create indexes ────────────────────────────────────────────────
    print("\n📇 Creating indexes...")
    from pymongo import GEOSPHERE
    await db.land_applications.create_index("application_id", unique=True)
    await db.land_applications.create_index("status")
    await db.land_applications.create_index("applicant_ref.applicant_id")
    await db.land_applications.create_index("parcel_ref.zone_id")
    await db.land_applications.create_index("timestamps.submitted_at")
    await db.parcels.create_index("parcel_code", unique=True)
    await db.parcels.create_index([("geometry", GEOSPHERE)])
    await db.applicants.create_index("identity.national_id", unique=True)
    await db.applicants.create_index("contacts.email", unique=True)
    await db.staff_members.create_index("staff_code", unique=True)
    await db.survey_tasks.create_index("application_id")
    await db.certificates.create_index("certificate_id", unique=True)
    await db.objections.create_index("application_id")
    print("   ✅ All indexes created")

    # ── Insert data ───────────────────────────────────────────────────
    print("\n📥 Inserting seed data...")

    applicants = make_applicants()
    result = await db.applicants.insert_many(applicants)
    print(f"   ✅ Applicants:    {len(result.inserted_ids)} inserted")

    staff = make_staff()
    result = await db.staff_members.insert_many(staff)
    print(f"   ✅ Staff members: {len(result.inserted_ids)} inserted")

    parcels = make_parcels()
    result = await db.parcels.insert_many(parcels)
    print(f"   ✅ Parcels:       {len(result.inserted_ids)} inserted")

    applications = make_applications()
    result = await db.land_applications.insert_many(applications)
    print(f"   ✅ Applications:  {len(result.inserted_ids)} inserted")

    tasks = make_survey_tasks()
    result = await db.survey_tasks.insert_many(tasks)
    print(f"   ✅ Survey tasks:  {len(result.inserted_ids)} inserted")

    docs = make_documents()
    result = await db.application_documents.insert_many(docs)
    print(f"   ✅ Documents:     {len(result.inserted_ids)} inserted")

    reports = make_survey_reports()
    result = await db.survey_reports.insert_many(reports)
    print(f"   ✅ Survey reports:{len(result.inserted_ids)} inserted")

    objections = make_objections()
    obj_result = await db.objections.insert_many(objections)
    print(f"   ✅ Objections:    {len(obj_result.inserted_ids)} inserted")

    # Update App 5 with the actual objection ID
    await db.land_applications.update_one(
        {"_id": APP_IDS[4]},
        {"$set": {"objection.objection_ids": list(obj_result.inserted_ids)}}
    )

    logs = make_performance_logs()
    result = await db.performance_logs.insert_many(logs)
    print(f"   ✅ Audit logs:    {len(result.inserted_ids)} inserted")

    # ── Summary ───────────────────────────────────────────────────────
    print("\n" + "="*55)
    print("  ✅ Seed Complete!")
    print("="*55)
    print("\n📋 What was created:\n")
    print("  APPLICANTS:")
    print("    APP-NR0001  Nour Ahmad         (citizen, verified)   ID: 400000001")
    print("    APP-KH0002  Khalid Hassan       (lawyer, verified)    ID: 400000002")
    print("    APP-PC0003  Palestine Const. Co.(company, verified)   ID: COM-2015-0099")
    print("    APP-SA0004  Sara Abdullah       (citizen, unverified) ID: 400000004")
    print("\n  STAFF MEMBERS:")
    print("    SURV-RM-01  Survey Team Alpha   (surveyor, zones: RM-01, RM-02)")
    print("    SURV-RM-02  Survey Team Beta    (surveyor, zone: RM-03)")
    print("    REG-RM-01   Ahmad Al-Registrar  (registrar, all zones)")
    print("\n  APPLICATIONS:")
    print("    LRMIS-2026-0001  approved        → Nour Ahmad,            ownership_transfer")
    print("    LRMIS-2026-0002  survey_required → Nour Ahmad,            boundary_correction")
    print("    LRMIS-2026-0003  legal_review    → Khalid Hassan,         ownership_transfer")
    print("    LRMIS-2026-0004  rejected        → Khalid Hassan,         ownership_transfer")
    print("    LRMIS-2026-0005  under_objection → Palestine Const. Co.,  first_registration")
    print("    LRMIS-2026-0006  submitted       → Sara Abdullah,         certificate_request")
    print("\n  WHAT TO TRY NEXT:")
    print("    • Open http://localhost:5173 and track LRMIS-2026-0001")
    print("    • Go to Staff Console and move LRMIS-2026-0006 to pre_checked")
    print("    • Issue a certificate for LRMIS-2026-0001 (it's already approved)")
    print("    • View the analytics dashboard to see live charts")
    print("    • Check the map — parcels have GeoJSON coordinates near Ramallah")
    print("\n  SWAGGER DOCS: http://localhost:8000/docs")
    print("="*55 + "\n")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
