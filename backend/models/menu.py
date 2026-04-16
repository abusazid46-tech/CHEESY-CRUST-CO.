# backend/models/menu.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class MenuItem(BaseModel):
    name: str
    category: str  # breakfast, lunch, dinner
    price: float
    original_price: str  # Formatted price string like "₹320"
    description: str
    image_url: str
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    name: str
    category: str
    price: float
    description: str
    image_url: str

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
