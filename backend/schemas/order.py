"""
Order schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class OrderTypeEnum(str, Enum):
    DELIVERY = "delivery"
    TAKEAWAY = "takeaway"
    DINE_IN = "dine_in"


class OrderStatusEnum(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderItemSchema(BaseModel):
    """Order item schema"""
    item_id: str
    name: str
    price: float
    quantity: int
    image_url: Optional[str] = None


class OrderCreateRequest(BaseModel):
    """Create order request"""
    items: List[OrderItemSchema]
    total: float = Field(..., gt=0)
    order_type: OrderTypeEnum
    address: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    """Order response"""
    id: str = Field(alias="_id")
    order_number: str
    items: List[dict]
    subtotal: float
    delivery_fee: float
    total: float
    order_type: str
    address: Optional[str] = None
    status: str
    payment_status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True


class OrderStatusUpdateRequest(BaseModel):
    """Update order status request"""
    status: OrderStatusEnum
    notes: Optional[str] = None
