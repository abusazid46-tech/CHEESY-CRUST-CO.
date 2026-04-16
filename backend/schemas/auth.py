# backend/schemas/auth.py
from pydantic import BaseModel

class SendOTPRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    is_admin: bool = False

class UserResponse(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    is_admin: bool = False
