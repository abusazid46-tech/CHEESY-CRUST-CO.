"""
Menu service - CRUD operations for menu items
"""

from datetime import datetime
from typing import List, Optional
from bson import ObjectId

from database import collections
from models.menu import MenuItem, MenuCategory


class MenuService:
    """Menu service class"""
    
    async def get_all_items(
        self,
        category: Optional[str] = None,
        available_only: bool = False,
        page: int = 1,
        per_page: int = 50
    ) -> dict:
        """Get all menu items with optional filtering"""
        
        query = {}
        if category:
            query["category"] = category
        if available_only:
            query["is_available"] = True
        
        total = await collections.menu_items.count_documents(query)
        skip = (page - 1) * per_page
        
        items = await collections.menu_items.find(query).skip(skip).limit(per_page).to_list(length=per_page)
        
        for item in items:
            item["_id"] = str(item["_id"])
        
        # Get categories list
        categories = await collections.menu_items.distinct("category")
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "categories": categories
        }
    
    async def get_item_by_id(self, item_id: str) -> Optional[dict]:
        """Get menu item by ID"""
        try:
            item = await collections.menu_items.find_one({"_id": ObjectId(item_id)})
            if item:
                item["_id"] = str(item["_id"])
            return item
        except Exception:
            return None
    
    async def get_item_by_slug(self, slug: str) -> Optional[dict]:
        """Get menu item by slug"""
        item = await collections.menu_items.find_one({"slug": slug})
        if item:
            item["_id"] = str(item["_id"])
        return item
    
    async def create_item(self, item_data: dict) -> dict:
        """Create new menu item"""
        item_data["slug"] = MenuItem.generate_slug(item_data["name"])
        item_data["created_at"] = datetime.utcnow()
        item_data["updated_at"] = datetime.utcnow()
        item_data["rating"] = {"avg": 0, "count": 0}
        
        result = await collections.menu_items.insert_one(item_data)
        
        item = await self.get_item_by_id(str(result.inserted_id))
        return item
    
    async def update_item(self, item_id: str, update_data: dict) -> Optional[dict]:
        """Update menu item"""
        try:
            if "name" in update_data:
                update_data["slug"] = MenuItem.generate_slug(update_data["name"])
            
            update_data["updated_at"] = datetime.utcnow()
            
            result = await collections.menu_items.find_one_and_update(
                {"_id": ObjectId(item_id)},
                {"$set": update_data},
                return_document=True
            )
            
            if result:
                result["_id"] = str(result["_id"])
            return result
        except Exception:
            return None
    
    async def delete_item(self, item_id: str) -> bool:
        """Delete menu item"""
        try:
            result = await collections.menu_items.delete_one({"_id": ObjectId(item_id)})
            return result.deleted_count > 0
        except Exception:
            return False
    
    async def get_categories(self) -> List[str]:
        """Get all menu categories"""
        return await collections.menu_items.distinct("category")
    
    async def search_items(self, query: str) -> List[dict]:
        """Search menu items by name or description"""
        items = await collections.menu_items.find({
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]
        }).limit(20).to_list(length=20)
        
        for item in items:
            item["_id"] = str(item["_id"])
        
        return items


# Singleton instance
menu_service = MenuService()
