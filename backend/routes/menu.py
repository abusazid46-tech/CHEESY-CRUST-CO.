# backend/routes/menu.py
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId

from database import get_database
from models.menu import MenuItem, MenuItemCreate, MenuItemUpdate
from dependencies import get_current_user, require_admin

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_menu_items(category: str = None):
    """Get all menu items, optionally filtered by category"""
    db = get_database()
    
    query = {"is_available": True}
    if category and category != "all":
        query["category"] = category
    
    cursor = db.menu_items.find(query)
    items = await cursor.to_list(length=None)
    
    # Convert ObjectId to string
    for item in items:
        item["_id"] = str(item["_id"])
    
    return items

@router.post("/", response_model=dict, dependencies=[Depends(require_admin)])
async def create_menu_item(item: MenuItemCreate, current_user=Depends(require_admin)):
    """Create a new menu item (admin only)"""
    db = get_database()
    
    # Format price string
    price_str = f"₹{int(item.price)}" if item.price.is_integer() else f"₹{item.price}"
    
    menu_item = MenuItem(
        name=item.name,
        category=item.category,
        price=item.price,
        original_price=price_str,
        description=item.description,
        image_url=item.image_url
    )
    
    result = await db.menu_items.insert_one(menu_item.dict())
    
    return {
        "id": str(result.inserted_id),
        "message": "Menu item created successfully"
    }

@router.put("/{item_id}", response_model=dict, dependencies=[Depends(require_admin)])
async def update_menu_item(item_id: str, item_update: MenuItemUpdate, current_user=Depends(require_admin)):
    """Update a menu item (admin only)"""
    db = get_database()
    
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    update_data = {k: v for k, v in item_update.dict().items() if v is not None}
    
    if "price" in update_data:
        price_str = f"₹{int(update_data['price'])}" if update_data['price'].is_integer() else f"₹{update_data['price']}"
        update_data["original_price"] = price_str
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.menu_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    return {"message": "Menu item updated successfully"}

@router.delete("/{item_id}", dependencies=[Depends(require_admin)])
async def delete_menu_item(item_id: str, current_user=Depends(require_admin)):
    """Delete a menu item (admin only)"""
    db = get_database()
    
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    result = await db.menu_items.delete_one({"_id": ObjectId(item_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    return {"message": "Menu item deleted successfully"}
