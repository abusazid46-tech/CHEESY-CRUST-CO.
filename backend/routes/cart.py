"""
Cart routes - shopping cart management
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any

from middleware import auth_required, get_current_user
from schemas.cart import CartItemAdd, CartItemUpdate, CartResponse
from services import cart_service

router = APIRouter()


@router.get("", response_model=CartResponse)
async def get_cart(payload: Dict[str, Any] = Depends(auth_required)):
    """Get current user's cart"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    cart = await cart_service.get_cart(user["_id"])
    
    # Format response
    items = []
    for item in cart.items:
        items.append({
            "item_id": item.item_id,
            "name": item.name,
            "price": item.price,
            "quantity": item.quantity,
            "image_url": item.image_url,
            "subtotal": item.subtotal
        })
    
    return CartResponse(
        _id=str(cart.id) if cart.id else "",
        items=items,
        total=cart.total,
        item_count=sum(i.quantity for i in cart.items),
        updated_at=cart.updated_at.isoformat()
    )


@router.post("/add")
async def add_to_cart(
    request: CartItemAdd,
    payload: Dict[str, Any] = Depends(auth_required)
):
    """Add item to cart"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    cart = await cart_service.add_item(
        user["_id"],
        request.item_id,
        request.quantity
    )
    
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add item to cart"
        )
    
    return {
        "success": True,
        "message": "Item added to cart",
        "cart_total": cart.total,
        "item_count": sum(i.quantity for i in cart.items)
    }


@router.put("/update")
async def update_cart_item(
    request: CartItemUpdate,
    payload: Dict[str, Any] = Depends(auth_required)
):
    """Update item quantity in cart"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    cart = await cart_service.update_item_quantity(
        user["_id"],
        request.item_id,
        request.quantity
    )
    
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update cart item"
        )
    
    return {
        "success": True,
        "message": "Cart updated",
        "cart_total": cart.total,
        "item_count": sum(i.quantity for i in cart.items)
    }


@router.delete("/remove/{item_id}")
async def remove_from_cart(
    item_id: str,
    payload: Dict[str, Any] = Depends(auth_required)
):
    """Remove item from cart"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    cart = await cart_service.remove_item(user["_id"], item_id)
    
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to remove item from cart"
        )
    
    return {
        "success": True,
        "message": "Item removed from cart",
        "cart_total": cart.total,
        "item_count": sum(i.quantity for i in cart.items)
    }


@router.delete("/clear")
async def clear_cart(payload: Dict[str, Any] = Depends(auth_required)):
    """Clear all items from cart"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    success = await cart_service.clear_cart(user["_id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to clear cart"
        )
    
    return {
        "success": True,
        "message": "Cart cleared successfully"
    }
