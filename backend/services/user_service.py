"""
User service - profile management
"""

from datetime import datetime
from typing import Optional, List
from bson import ObjectId

from database import collections
from models.user import User, Address


class UserService:
    """User service class"""
    
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID"""
        try:
            user = await collections.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user["_id"] = str(user["_id"])
            return user
        except Exception:
            return None
    
    async def get_user_by_phone(self, phone: str) -> Optional[dict]:
        """Get user by phone number"""
        user = await collections.users.find_one({"phone": phone})
        if user:
            user["_id"] = str(user["_id"])
        return user
    
    async def update_user(self, user_id: str, update_data: dict) -> Optional[dict]:
        """Update user profile"""
        try:
            update_data["updated_at"] = datetime.utcnow()
            
            result = await collections.users.find_one_and_update(
                {"_id": ObjectId(user_id)},
                {"$set": update_data},
                return_document=True
            )
            
            if result:
                result["_id"] = str(result["_id"])
            return result
        except Exception:
            return None
    
    async def add_address(self, user_id: str, address: Address) -> Optional[List[dict]]:
        """Add address to user"""
        address_dict = address.model_dump()
        address_dict["id"] = str(ObjectId())
        
        result = await collections.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {"addresses": address_dict}}
        )
        
        if result.modified_count:
            user = await self.get_user_by_id(user_id)
            return user.get("addresses", [])
        return None
    
    async def update_address(self, user_id: str, address_id: str, update_data: dict) -> bool:
        """Update user address"""
        update_fields = {}
        for key, value in update_data.items():
            if value is not None:
                update_fields[f"addresses.$.{key}"] = value
        
        if not update_fields:
            return False
        
        result = await collections.users.update_one(
            {"_id": ObjectId(user_id), "addresses.id": address_id},
            {"$set": update_fields}
        )
        
        return result.modified_count > 0
    
    async def delete_address(self, user_id: str, address_id: str) -> bool:
        """Delete user address"""
        result = await collections.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"addresses": {"id": address_id}}}
        )
        
        return result.modified_count > 0
    
    async def set_default_address(self, user_id: str, address_id: str) -> bool:
        """Set address as default"""
        # Remove default from all addresses
        await collections.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"addresses.$[].is_default": False}}
        )
        
        # Set new default
        result = await collections.users.update_one(
            {"_id": ObjectId(user_id), "addresses.id": address_id},
            {"$set": {"addresses.$.is_default": True}}
        )
        
        return result.modified_count > 0
    
    async def get_user_orders(self, user_id: str, limit: int = 50) -> List[dict]:
        """Get user's order history"""
        orders = await collections.orders.find(
            {"user_id": ObjectId(user_id)}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        for order in orders:
            order["_id"] = str(order["_id"])
            order["user_id"] = str(order["user_id"])
        
        return orders
    
    async def get_user_reservations(self, user_id: str) -> List[dict]:
        """Get user's reservations"""
        reservations = await collections.reservations.find(
            {"user_id": ObjectId(user_id)}
        ).sort("created_at", -1).to_list(length=50)
        
        for res in reservations:
            res["_id"] = str(res["_id"])
            if res.get("user_id"):
                res["user_id"] = str(res["user_id"])
        
        return reservations


# Singleton instance
user_service = UserService()
