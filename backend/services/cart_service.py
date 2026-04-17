"""
Cart service - shopping cart management
"""

from datetime import datetime
from typing import Optional, List
from bson import ObjectId

from database import collections
from models.cart import Cart, CartItem


class CartService:
    """Cart service class"""
    
    async def get_cart(self, user_id: str) -> Cart:
        """Get or create user's cart"""
        try:
            cart_doc = await collections.carts.find_one({"user_id": ObjectId(user_id)})
            
            if cart_doc:
                cart_doc["_id"] = str(cart_doc["_id"])
                cart_doc["user_id"] = str(cart_doc["user_id"])
                return Cart(**cart_doc)
            
            # Create empty cart
            cart = Cart(
                user_id=ObjectId(user_id),
                items=[],
                total=0.0
            )
            
            await collections.carts.insert_one(cart.model_dump(by_alias=True))
            return cart
        except Exception as e:
            # Return empty cart on error
            return Cart(user_id=ObjectId(user_id), items=[], total=0.0)
    
    async def add_item(self, user_id: str, item_id: str, quantity: int = 1) -> Optional[Cart]:
        """Add item to cart"""
        try:
            # Get menu item details
            menu_item = await collections.menu_items.find_one({"_id": ObjectId(item_id)})
            if not menu_item or not menu_item.get("is_available", False):
                return None
            
            cart = await self.get_cart(user_id)
            
            # Check if item already in cart
            existing_item = next((i for i in cart.items if i.item_id == item_id), None)
            
            if existing_item:
                # Update quantity
                existing_item.quantity += quantity
            else:
                # Add new item
                cart.items.append(CartItem(
                    item_id=item_id,
                    name=menu_item["name"],
                    price=menu_item["price"],
                    quantity=quantity,
                    image_url=menu_item.get("image_url")
                ))
            
            cart.update_total()
            
            # Update in database
            await collections.carts.update_one(
                {"user_id": ObjectId(user_id)},
                {"$set": {
                    "items": [i.model_dump() for i in cart.items],
                    "total": cart.total,
                    "updated_at": cart.updated_at
                }}
            )
            
            return cart
        except Exception:
            return None
    
    async def update_item_quantity(self, user_id: str, item_id: str, quantity: int) -> Optional[Cart]:
        """Update item quantity in cart"""
        cart = await self.get_cart(user_id)
        
        existing_item = next((i for i in cart.items if i.item_id == item_id), None)
        if not existing_item:
            return None
        
        if quantity <= 0:
            # Remove item
            cart.items = [i for i in cart.items if i.item_id != item_id]
        else:
            existing_item.quantity = quantity
        
        cart.update_total()
        
        await collections.carts.update_one(
            {"user_id": ObjectId(user_id)},
            {"$set": {
                "items": [i.model_dump() for i in cart.items],
                "total": cart.total,
                "updated_at": cart.updated_at
            }}
        )
        
        return cart
    
    async def remove_item(self, user_id: str, item_id: str) -> Optional[Cart]:
        """Remove item from cart"""
        return await self.update_item_quantity(user_id, item_id, 0)
    
    async def clear_cart(self, user_id: str) -> bool:
        """Clear all items from cart"""
        try:
            result = await collections.carts.update_one(
                {"user_id": ObjectId(user_id)},
                {"$set": {
                    "items": [],
                    "total": 0.0,
                    "updated_at": datetime.utcnow()
                }}
            )
            return result.modified_count > 0
        except Exception:
            return False
    
    async def get_cart_item_count(self, user_id: str) -> int:
        """Get total items count in cart"""
        cart = await self.get_cart(user_id)
        return sum(item.quantity for item in cart.items)


# Singleton instance
cart_service = CartService()
