# backend/routes/orders.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from database import get_database
from models.order import OrderCreate, Order, OrderStatus, PaymentStatus
from dependencies import get_current_user, require_admin

router = APIRouter()

@router.post("/create")
async def create_order(order_data: OrderCreate, current_user=Depends(get_current_user)):
    """Create a new order"""
    db = get_database()
    
    user_id = str(current_user["_id"])
    
    # Get user's cart
    cart = await db.carts.find_one({"user_id": user_id})
    
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Validate delivery address if order type is delivery
    if order_data.order_type == "delivery" and not order_data.address:
        raise HTTPException(status_code=400, detail="Delivery address required")
    
    # Create order items
    order_items = []
    for item in cart["items"]:
        order_items.append({
            "menu_item_id": item["menu_item_id"],
            "name": item["name"],
            "price": item["price"],
            "quantity": item["quantity"]
        })
    
    # Create order
    order = Order(
        user_id=user_id,
        items=order_items,
        total=cart["total"],
        order_type=order_data.order_type,
        address=order_data.address if order_data.order_type == "delivery" else None,
        payment_status=PaymentStatus.PENDING,
        order_status=OrderStatus.PENDING
    )
    
    result = await db.orders.insert_one(order.dict())
    order_id = str(result.inserted_id)
    
    # Clear user's cart
    await db.carts.delete_one({"user_id": user_id})
    
    return {
        "order_id": order_id,
        "total": cart["total"],
        "message": "Order created successfully"
    }

@router.get("/user")
async def get_user_orders(current_user=Depends(get_current_user)):
    """Get current user's orders"""
    db = get_database()
    
    user_id = str(current_user["_id"])
    
    cursor = db.orders.find({"user_id": user_id}).sort("created_at", -1)
    orders = await cursor.to_list(length=None)
    
    for order in orders:
        order["_id"] = str(order["_id"])
    
    return orders

@router.get("/{order_id}")
async def get_order_details(order_id: str, current_user=Depends(get_current_user)):
    """Get order details"""
    db = get_database()
    
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns the order or is admin
    user_id = str(current_user["_id"])
    if str(order["user_id"]) != user_id and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    order["_id"] = str(order["_id"])
    return order

@router.put("/{order_id}/status", dependencies=[Depends(require_admin)])
async def update_order_status(order_id: str, status: str, current_user=Depends(require_admin)):
    """Update order status (admin only)"""
    db = get_database()
    
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    if status not in [s.value for s in OrderStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "order_status": status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}
