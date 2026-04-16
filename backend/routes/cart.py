# backend/routes/cart.py
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from database import get_database
from models.cart import CartAddItem, CartRemoveItem
from dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def get_cart(current_user=Depends(get_current_user)):
    """Get user's cart"""
    db = get_database()
    
    user_id = str(current_user["_id"])
    cart = await db.carts.find_one({"user_id": user_id})
    
    if not cart:
        return {"items": [], "total": 0}
    
    cart["_id"] = str(cart["_id"])
    return cart

@router.post("/add")
async def add_to_cart(item: CartAddItem, current_user=Depends(get_current_user)):
    """Add item to cart"""
    db = get_database()
    
    user_id = str(current_user["_id"])
    
    # Get menu item details
    if not ObjectId.is_valid(item.menu_item_id):
        raise HTTPException(status_code=400, detail="Invalid menu item ID")
    
    menu_item = await db.menu_items.find_one({"_id": ObjectId(item.menu_item_id)})
    
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Find user's cart
    cart = await db.carts.find_one({"user_id": user_id})
    
    if not cart:
        # Create new cart
        cart_item = {
            "menu_item_id": item.menu_item_id,
            "name": menu_item["name"],
            "price": menu_item["price"],
            "quantity": item.quantity
        }
        
        new_cart = {
            "user_id": user_id,
            "items": [cart_item],
            "total": menu_item["price"] * item.quantity,
            "updated_at": datetime.utcnow()
        }
        
        result = await db.carts.insert_one(new_cart)
        return {"message": "Item added to cart", "cart_id": str(result.inserted_id)}
    else:
        # Update existing cart
        items = cart.get("items", [])
        item_exists = False
        
        for i, cart_item in enumerate(items):
            if cart_item["menu_item_id"] == item.menu_item_id:
                items[i]["quantity"] += item.quantity
                item_exists = True
                break
        
        if not item_exists:
            items.append({
                "menu_item_id": item.menu_item_id,
                "name": menu_item["name"],
                "price": menu_item["price"],
                "quantity": item.quantity
            })
        
        # Recalculate total
        total = sum(i["price"] * i["quantity"] for i in items)
        
        await db.carts.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "items": items,
                    "total": total,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Item added to cart"}

@router.delete("/remove")
async def remove_from_cart(item: CartRemoveItem, current_user=Depends(get_current_user)):
    """Remove item from cart"""
    db = get_database()
    
    user_id = str(current_user["_id"])
    
    cart = await db.carts.find_one({"user_id": user_id})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = [i for i in cart.get("items", []) if i["menu_item_id"] != item.menu_item_id]
    
    # Recalculate total
    total = sum(i["price"] * i["quantity"] for i in items)
    
    await db.carts.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "items": items,
                "total": total,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Item removed from cart"}
