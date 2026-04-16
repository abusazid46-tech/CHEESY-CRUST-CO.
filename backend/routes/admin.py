# backend/routes/admin.py
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from bson import ObjectId

from database import get_database
from dependencies import require_admin

router = APIRouter()

@router.get("/dashboard", dependencies=[Depends(require_admin)])
async def get_admin_dashboard(current_user=Depends(require_admin)):
    """Get admin dashboard statistics"""
    db = get_database()
    
    # Get today's date range
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Today's orders
    today_orders = await db.orders.count_documents({
        "created_at": {"$gte": today_start, "$lt": today_end}
    })
    
    # Today's revenue
    today_revenue_cursor = db.orders.aggregate([
        {
            "$match": {
                "created_at": {"$gte": today_start, "$lt": today_end},
                "payment_status": "paid"
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ])
    today_revenue_result = await today_revenue_cursor.to_list(length=1)
    today_revenue = today_revenue_result[0]["total"] if today_revenue_result else 0
    
    # Total orders
    total_orders = await db.orders.count_documents({})
    
    # Total revenue
    total_revenue_cursor = db.orders.aggregate([
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ])
    total_revenue_result = await total_revenue_cursor.to_list(length=1)
    total_revenue = total_revenue_result[0]["total"] if total_revenue_result else 0
    
    # Today's reservations
    today_reservations = await db.reservations.count_documents({
        "date": today_start.strftime("%Y-%m-%d")
    })
    
    # Pending orders
    pending_orders = await db.orders.count_documents({"order_status": "pending"})
    
    return {
        "today_orders": today_orders,
        "today_revenue": today_revenue,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "today_reservations": today_reservations,
        "pending_orders": pending_orders
    }

@router.get("/orders", dependencies=[Depends(require_admin)])
async def get_all_orders(limit: int = 50, offset: int = 0, current_user=Depends(require_admin)):
    """Get all orders with pagination"""
    db = get_database()
    
    cursor = db.orders.find().sort("created_at", -1).skip(offset).limit(limit)
    orders = await cursor.to_list(length=limit)
    
    for order in orders:
        order["_id"] = str(order["_id"])
        order["user_id"] = str(order["user_id"])
    
    total = await db.orders.count_documents({})
    
    return {
        "orders": orders,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/revenue/daily", dependencies=[Depends(require_admin)])
async def get_daily_revenue(days: int = 7, current_user=Depends(require_admin)):
    """Get daily revenue for last N days"""
    db = get_database()
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date, "$lte": end_date},
                "payment_status": "paid"
            }
        },
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "revenue": {"$sum": "$total"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.orders.aggregate(pipeline).to_list(length=None)
    
    return results
