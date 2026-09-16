from pydantic import BaseModel, Field
from typing import Optional


class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str
    role: str = "patient"
    village: str = ""


class LoginRequest(BaseModel):
    phone: str
    password: str


class UserProfile(BaseModel):
    id: int
    name: str
    phone: str
    role: str
    village: str
    created_at: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class ResetPasswordRequest(BaseModel):
    phone: str
    new_password: str

