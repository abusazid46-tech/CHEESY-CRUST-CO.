"""
User routes - profile management
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any

from middleware import auth_required, get_current_user
from schemas.user import (
    UserProfileResponse, UserUpdateRequest,
    AddAddressRequest, UpdateAddressRequest
)
from services import user_service

router = APIRouter()


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(payload: Dict[str, Any] = Depends(auth_required)):
    """Get current user profile"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Format response
    return UserProfileResponse(
        id=user["_id"],
        phone=user["phone"],
        name=user.get("name"),
        email=user.get("email"),
        dob=user.get("dob"),
        addresses=user.get("addresses", []),
        created_at=user["created_at"],
        is_active=user.get("is_active", True)
    )


@router.put("/profile")
async def update_profile(
    request: UserUpdateRequest,
    payload: Dict[str, Any] = Depends(auth_required)
):
    """Update user profile"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = request.model_dump(exclude_unset=True)
    updated_user = await user_service.update_user(user["_id"], update_data)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update profile"
        )
    
    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": UserProfileResponse(
            id=updated_user["_id"],
            phone=updated_user["phone"],
            name=updated_user.get("name"),
            email=updated_user.get("email"),
            dob=updated_user.get("dob"),
            addresses=updated_user.get("addresses", []),
            created_at=updated_user["created_at"],
            is_active=updated_user.get("is_active", True)
        )
    }


@router.get("/orders")
async def get_my_orders(payload: Dict[str, Any] = Depends(auth_required)):
    """Get current user's orders"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    orders = await user_service.get_user_orders(user["_id"])
    
    return {
        "success": True,
        "orders": orders,
        "total": len(orders)
    }


@router.get("/reservations")
async def get_my_reservations(payload: Dict[str, Any] = Depends(auth_required)):
    """Get current user's reservations"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    reservations = await user_service.get_user_reservations(user["_id"])
    
    return {
        "success": True,
        "reservations": reservations,
        "total": len(reservations)
    }


@router.post("/addresses")
async def add_address(
    request: AddAddressRequest,
    payload: Dict[str, Any] = Depends(auth_required)
):
    """Add a new address"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    from models.user import Address
    address = Address(
        label=request.label,
        full=request.full,
        is_default=request.is_default
    )
    
    addresses = await user_service.add_address(user["_id"], address)
    
    if addresses is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add address"
        )
    
    return {
        "success": True,
        "message": "Address added successfully",
        "addresses": addresses
    }


@router.put("/addresses/{address_id}")
async def update_address(
    address_id: str,
    request: UpdateAddressRequest,
    payload: Dict[str, Any] = Depends(auth_required)
):
    """Update an address"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = request.model_dump(exclude_unset=True)
    success = await user_service.update_address(user["_id"], address_id, update_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update address"
        )
    
    return {
        "success": True,
        "message": "Address updated successfully"
    }


@router.delete("/addresses/{address_id}")
async def delete_address(
    address_id: str,
    payload: Dict[str, Any] = Depends(auth_required)
):
    """Delete an address"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    success = await user_service.delete_address(user["_id"], address_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete address"
        )
    
    return {
        "success": True,
        "message": "Address deleted successfully"
    }


@router.post("/addresses/{address_id}/default")
async def set_default_address(
    address_id: str,
    payload: Dict[str, Any] = Depends(auth_required)
):
    """Set address as default"""
    user = await get_current_user(payload)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    success = await user_service.set_default_address(user["_id"], address_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to set default address"
        )
    
    return {
        "success": True,
        "message": "Default address updated successfully"
    }
