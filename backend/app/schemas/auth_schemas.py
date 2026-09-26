from pydantic import BaseModel, Field
from typing import Optional, List, Union
from datetime import datetime


class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    username: Optional[str] = None
    email: Optional[str] = None
    role: str = "patient"
    village: str = ""


class LoginRequest(BaseModel):
    phone: Optional[str] = None
    identifier: Optional[str] = None
    password: str


class UserProfile(BaseModel):
    id: int
    name: str
    phone: str
    username: Optional[str] = None
    email: Optional[str] = None
    role: str
    village: Optional[str] = ""
    age: Optional[int] = None
    gender: Optional[str] = None
    district: Optional[str] = "Chamoli"
    state: Optional[str] = "Uttarakhand"
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    language_preference: Optional[str] = "hi"
    comorbidities: Optional[str] = None
    allergies: Optional[str] = None
    worker_id: Optional[str] = None
    assigned_phc: Optional[str] = None
    abha_id: Optional[str] = None
    avatar_url: Optional[str] = None
    settings_json: Optional[str] = None
    created_at: Union[str, datetime]


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    village: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    language_preference: Optional[str] = None
    comorbidities: Optional[str] = None
    allergies: Optional[str] = None
    worker_id: Optional[str] = None
    assigned_phc: Optional[str] = None
    abha_id: Optional[str] = None
    avatar_url: Optional[str] = None
    settings_json: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters)")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class ResetPasswordRequest(BaseModel):
    phone: Optional[str] = None
    identifier: Optional[str] = None
    new_password: str = Field(..., min_length=6, description="New password")


class CheckUsernameResponse(BaseModel):
    username: str
    available: bool
    suggestions: List[str] = []


class SendOtpRequest(BaseModel):
    target: str = Field(..., description="Email address or 10-digit mobile number")
    purpose: str = Field("register", description="Purpose: register, login, or reset_password")


class VerifyOtpRequest(BaseModel):
    target: str = Field(..., description="Email address or 10-digit mobile number")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    purpose: str = Field("register", description="Purpose: register, login, or reset_password")


class ResetPasswordWithOtpRequest(BaseModel):
    target: str = Field(..., description="Email address or 10-digit mobile number")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP received")
    new_password: str = Field(..., min_length=6, description="New password")


class OtpResponse(BaseModel):
    success: bool
    message: str
    target_type: Optional[str] = None
    dev_otp: Optional[str] = None


class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    description: Optional[str] = None
    village: Optional[str] = None
    ip_address: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: Union[str, datetime]


class ClientActivityRequest(BaseModel):
    action: str = Field(..., description="Activity name, e.g. WELLNESS, SCREENING, EMERGENCY_SOS, CONSULTATION")
    description: Optional[str] = None
    metadata: Optional[dict] = None


