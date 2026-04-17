"""
Admin routes - dashboard and management
"""

from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from middleware import get_current_admin_user
from database import collections

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats(admin: Dict[str, Any] = Depends(get_current_admin_user)):
    """Get admin dashboard statistics"""
    
    # Get counts
    total_users = await collections.users.count_documents({})
    total_orders = await collections.orders.count_documents({})
    total_reservations = await collections.reservations.count_documents({})
    
    # Today's stats
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await collections.orders.count_documents({
        "created_at": {"$gte": today}
    })
    today_reservations = await collections.reservations.count_documents({
        "created_at": {"$gte": today}
    })
    
    # Revenue stats
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total"},
            "avg_order_value": {"$avg": "$total"}
        }}
    ]
    revenue_result = await collections.orders.aggregate(pipeline).to_list(length=1)
    revenue_stats = revenue_result[0] if revenue_result else {"total_revenue": 0, "avg_order_value": 0}
    
    # Today's revenue
    today_pipeline = [
        {"$match": {
            "payment_status": "paid",
            "created_at": {"$gte": today}
        }},
        {"$group": {
            "_id": None,
            "revenue": {"$sum": "$total"}
        }}
    ]
    today_revenue_result = await collections.orders.aggregate(today_pipeline).to_list(length=1)
    today_revenue = today_revenue_result[0]["revenue"] if today_revenue_result else 0
    
    # Recent orders
    recent_orders = await collections.orders.find().sort(
        "created_at", -1
    ).limit(5).to_list(length=5)
    
    for order in recent_orders:
        order["_id"] = str(order["_id"])
        order["user_id"] = str(order["user_id"])
    
    # Recent reservations
    recent_reservations = await collections.reservations.find().sort(
        "created_at", -1
    ).limit(5).to_list(length=5)
    
    for res in recent_reservations:
        res["_id"] = str(res["_id"])
    
    return {
        "success": True,
        "stats": {
            "total_users": total_users,
            "total_orders": total_orders,
            "total_reservations": total_reservations,
            "today_orders": today_orders,
            "today_reservations": today_reservations,
            "total_revenue": round(revenue_stats["total_revenue"], 2),
            "avg_order_value": round(revenue_stats["avg_order_value"], 2),
            "today_revenue": round(today_revenue, 2)
        },
        "recent_orders": recent_orders,
        "recent_reservations": recent_reservations
    }


@router.get("/users")
async def get_all_users(
    admin: Dict[str, Any] = Depends(get_current_admin_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None)
):
    """Get all users (admin only)"""
    query = {}
    if search:
        query["$or"] = [
            {"phone": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
    
    total = await collections.users.count_documents(query)
    skip = (page - 1) * per_page
    
    users = await collections.users.find(query).skip(skip).limit(per_page).to_list(length=per_page)
    
    for user in users:
        user["_id"] = str(user["_id"])
        # Remove sensitive info
        user.pop("password", None)
    
    return {
        "success": True,
        "users": users,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }


@router.get("/sales-summary")
async def get_sales_summary(
    admin: Dict[str, Any] = Depends(get_current_admin_user),
    period: str = Query("week", description="day, week, month")
):
    """Get sales summary for charts"""
    
    now = datetime.utcnow()
    
    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        group_format = "%H"
        days = 1
    elif period == "week":
        start = now - timedelta(days=7)
        group_format = "%Y-%m-%d"
        days = 7
    else:  # month
        start = now - timedelta(days=30)
        group_format = "%Y-%m-%d"
        days = 30
    
    pipeline = [
        {"$match": {
            "payment_status": "paid",
            "created_at": {"$gte": start}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": group_format, "date": "$created_at"}},
            "revenue": {"$sum": "$total"},
            "orders": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await collections.orders.aggregate(pipeline).to_list(length=days)
    
    # Top selling items
    item_pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.name",
            "total_quantity": {"$sum": "$items.quantity"},
            "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
        }},
        {"$sort": {"total_quantity": -1}},
        {"$limit": 5}
    ]
    
    top_items = await collections.orders.aggregate(item_pipeline).to_list(length=5)
    
    return {
        "success": True,
        "period": period,
        "sales_data": results,
        "top_items": top_items
    }
