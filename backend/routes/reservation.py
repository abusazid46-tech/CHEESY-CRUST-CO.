# backend/routes/reservation.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from database import get_database
from models.reservation import ReservationCreate, Reservation
from dependencies import get_current_user, require_admin

router = APIRouter()

@router.post("/")
async def create_reservation(reservation_data: ReservationCreate, current_user=Depends(get_current_user)):
    """Create a new table reservation"""
    db = get_database()
    
    # Validate pre-order items
    pre_order_items = []
    for item in reservation_data.pre_order_items:
        if not ObjectId.is_valid(item.get("menu_item_id")):
            raise HTTPException(status_code=400, detail="Invalid menu item ID")
        
        menu_item = await db.menu_items.find_one({"_id": ObjectId(item.get("menu_item_id"))})
        
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item.get('name')} not found")
        
        pre_order_items.append({
            "menu_item_id": item.get("menu_item_id"),
            "name": item.get("name"),
            "quantity": item.get("quantity", 1)
        })
    
    # Create reservation
    reservation = Reservation(
        name=reservation_data.name,
        phone=reservation_data.phone,
        date=reservation_data.date,
        time=reservation_data.time,
        guests=reservation_data.guests,
        pre_order_items=pre_order_items
    )
    
    result = await db.reservations.insert_one(reservation.dict())
    
    return {
        "reservation_id": str(result.inserted_id),
        "message": "Table reserved successfully!"
    }

@router.get("/all", dependencies=[Depends(require_admin)])
async def get_all_reservations(current_user=Depends(require_admin)):
    """Get all reservations (admin only)"""
    db = get_database()
    
    cursor = db.reservations.find().sort("date", -1)
    reservations = await cursor.to_list(length=None)
    
    for reservation in reservations:
        reservation["_id"] = str(reservation["_id"])
    
    return reservations

@router.get("/user")
async def get_user_reservations(current_user=Depends(get_current_user)):
    """Get current user's reservations"""
    db = get_database()
    
    phone = current_user["phone"]
    
    cursor = db.reservations.find({"phone": phone}).sort("date", -1)
    reservations = await cursor.to_list(length=None)
    
    for reservation in reservations:
        reservation["_id"] = str(reservation["_id"])
    
    return reservations
