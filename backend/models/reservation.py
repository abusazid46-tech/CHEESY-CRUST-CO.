# backend/models/reservation.py
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class PreOrderItem(BaseModel):
    menu_item_id: str
    name: str
    quantity: int

class Reservation(BaseModel):
    name: str
    phone: str
    date: str
    time: str
    guests: int
    pre_order_items: List[PreOrderItem] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "confirmed"  # confirmed, cancelled, completed

class ReservationCreate(BaseModel):
    name: str
    phone: str
    date: str
    time: str
    guests: int
    pre_order_items: List[dict] = []
