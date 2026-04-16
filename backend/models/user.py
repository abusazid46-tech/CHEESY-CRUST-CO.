# backend/models/user.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class User(BaseModel):
    phone: str
    email: Optional[str] = None
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_admin: bool = False
    last_login: Optional[datetime] = None

class OTPSession(BaseModel):
    phone: str
    otp: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    verified: bool = False
