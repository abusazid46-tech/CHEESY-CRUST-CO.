# backend/models/cart.py
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class CartItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int = 1

class Cart(BaseModel):
    user_id: str
    items: List[CartItem] = []
    total: float = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CartAddItem(BaseModel):
    menu_item_id: str
    quantity: int = 1

class CartRemoveItem(BaseModel):
    menu_item_id: str
