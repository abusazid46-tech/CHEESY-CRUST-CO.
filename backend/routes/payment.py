# backend/routes/payment.py
from fastapi import APIRouter, HTTPException, Depends
import razorpay
from bson import ObjectId
from datetime import datetime

from config.settings import settings
from database import get_database
from models.order import PaymentStatus
from dependencies import get_current_user

router = APIRouter()

# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

@router.post("/create-order")
async def create_payment_order(order_id: str, current_user=Depends(get_current_user)):
    """Create Razorpay payment order"""
    db = get_database()
    
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")
    
    # Get order
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns the order
    user_id = str(current_user["_id"])
    if str(order["user_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create Razorpay order
    razorpay_order = razorpay_client.order.create({
        'amount': int(order["total"] * 100),  # Amount in paise
        'currency': 'INR',
        'receipt': order_id,
        'payment_capture': 1
    })
    
    # Store Razorpay order ID
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"razorpay_order_id": razorpay_order['id']}}
    )
    
    return {
        "razorpay_order_id": razorpay_order['id'],
        "amount": order["total"],
        "currency": "INR",
        "key": settings.RAZORPAY_KEY_ID
    }

@router.post("/verify")
async def verify_payment(payment_data: dict, current_user=Depends(get_current_user)):
    """Verify Razorpay payment signature"""
    db = get_database()
    
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature(payment_data)
        
        # Update payment status
        order_id = payment_data.get('order_id')
        razorpay_payment_id = payment_data.get('razorpay_payment_id')
        
        if not order_id or not ObjectId.is_valid(order_id):
            raise HTTPException(status_code=400, detail="Invalid order ID")
        
        await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {
                "$set": {
                    "payment_status": PaymentStatus.PAID,
                    "razorpay_payment_id": razorpay_payment_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Payment verified successfully", "status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")
