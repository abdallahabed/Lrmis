from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import re


ApplicantType = Literal["citizen", "lawyer", "company", "surveyor", "authorized_representative"]
VerificationState = Literal["unverified", "verified", "suspended"]
PreferredContact = Literal["email", "phone", "sms"]
Language = Literal["en", "ar"]


class IdentityCreate(BaseModel):
    national_id: str = Field(..., min_length=5, max_length=20, description="National ID or registration number")

    @field_validator("national_id")
    @classmethod
    def validate_national_id(cls, v):
        if not re.match(r"^[0-9A-Za-z\-]+$", v):
            raise ValueError("National ID must contain only alphanumeric characters and hyphens")
        return v.strip()


class ContactsCreate(BaseModel):
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
            raise ValueError("Invalid phone number format")
        return cleaned


class AddressCreate(BaseModel):
    city: str = Field(..., min_length=2, max_length=100)
    neighborhood: Optional[str] = Field(None, max_length=100)
    zone_id: Optional[str] = Field(None, max_length=50)
    street: Optional[str] = Field(None, max_length=200)


class NotificationPreferences(BaseModel):
    on_status_change: bool = True
    on_missing_documents: bool = True
    on_certificate_ready: bool = True
    on_objection_update: bool = True


class Preferences(BaseModel):
    preferred_contact: PreferredContact = "email"
    language: Language = "en"
    notifications: NotificationPreferences = NotificationPreferences()


class PrivacySettings(BaseModel):
    show_contact_to_staff: bool = True
    show_address_to_staff: bool = True


# ── Create ──────────────────────────────────────────────────────────
class ApplicantCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    applicant_type: ApplicantType = "citizen"
    identity: IdentityCreate
    contacts: ContactsCreate
    address: AddressCreate
    preferences: Optional[Preferences] = Preferences()
    privacy_settings: Optional[PrivacySettings] = PrivacySettings()

    # Extra fields for lawyers/companies
    organization_name: Optional[str] = Field(None, max_length=200)
    license_number: Optional[str] = Field(None, max_length=100)


# ── Update ───────────────────────────────────────────────────────────
class ApplicantUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    contacts: Optional[ContactsCreate] = None
    address: Optional[AddressCreate] = None
    preferences: Optional[Preferences] = None
    privacy_settings: Optional[PrivacySettings] = None
    organization_name: Optional[str] = None
    license_number: Optional[str] = None


# ── Response ─────────────────────────────────────────────────────────
class ApplicantResponse(BaseModel):
    id: str
    applicant_code: str
    full_name: str
    applicant_type: ApplicantType
    verification_state: VerificationState
    identity: dict
    contacts: dict
    address: dict
    preferences: dict
    stats: dict
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
