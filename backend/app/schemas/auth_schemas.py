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
    created_at: Union[str, datetime]


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


