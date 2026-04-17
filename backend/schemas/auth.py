"""
Authentication request/response schemas
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional


class SendOTPRequest(BaseModel):
    """Request schema for sending OTP"""
    phone: str = Field(..., description="Phone number with country code")
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        import re
        digits = re.sub(r'\D', '', v)
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("Invalid phone number")
        return v


class SendOTPResponse(BaseModel):
    """Response schema for OTP send"""
    success: bool = True
    message: str = "OTP sent successfully"
    phone: str
    expires_in: int = 300  # seconds


class VerifyOTPRequest(BaseModel):
    """Request schema for OTP verification"""
    phone: str
    otp: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    phone: str
    name: Optional[str] = None
    is_admin: bool = False


class RefreshTokenRequest(BaseModel):
    """Request schema for token refresh"""
    refresh_token: str


class AuthMessageResponse(BaseModel):
    """Simple message response"""
    message: str
    success: bool = True
