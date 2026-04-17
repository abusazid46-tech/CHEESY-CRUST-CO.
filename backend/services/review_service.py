"""
Review service - customer reviews management
"""

from datetime import datetime
from typing import Optional, List
from bson import ObjectId

from database import collections


class ReviewService:
    """Review service class"""
    
    async def create_review(
        self,
        user_id: str,
        item_id: str,
        rating: int,
        comment: str,
        order_id: Optional[str] = None
    ) -> Optional[dict]:
        """Create a new review"""
        try:
            # Get user info
            user = await collections.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            # Check if item exists
            item = await collections.menu_items.find_one({"_id": ObjectId(item_id)})
            if not item:
                return None
            
            # Create review
            review = {
                "user_id": ObjectId(user_id),
                "user_name": user.get("name", "Customer"),
                "item_id": item_id,
                "item_name": item["name"],
                "rating": rating,
                "comment": comment,
                "order_id": order_id,
                "created_at": datetime.utcnow(),
                "is_verified": bool(order_id)
            }
            
            result = await collections.reviews.insert_one(review)
            review["_id"] = str(result.inserted_id)
            review["user_id"] = str(review["user_id"])
            
            # Update item's average rating
            await self._update_item_rating(item_id)
            
            return review
        except Exception as e:
            print(f"Review creation error: {e}")
            return None
    
    async def _update_item_rating(self, item_id: str):
        """Update menu item's average rating"""
        pipeline = [
            {"$match": {"item_id": item_id}},
            {"$group": {
                "_id": None,
                "avg_rating": {"$avg": "$rating"},
                "count": {"$sum": 1}
            }}
        ]
        
        result = await collections.reviews.aggregate(pipeline).to_list(length=1)
        
        if result:
            avg = round(result[0]["avg_rating"], 1)
            count = result[0]["count"]
        else:
            avg = 0
            count = 0
        
        await collections.menu_items.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": {"rating": {"avg": avg, "count": count}}}
        )
    
    async def get_item_reviews(self, item_id: str, page: int = 1, per_page: int = 10) -> dict:
        """Get reviews for a specific item"""
        total = await collections.reviews.count_documents({"item_id": item_id})
        skip = (page - 1) * per_page
        
        reviews = await collections.reviews.find(
            {"item_id": item_id}
        ).sort("created_at", -1).skip(skip).limit(per_page).to_list(length=per_page)
        
        for review in reviews:
            review["_id"] = str(review["_id"])
            review["user_id"] = str(review["user_id"])
        
        return {
            "reviews": reviews,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def get_user_reviews(self, user_id: str) -> List[dict]:
        """Get all reviews by a user"""
        reviews = await collections.reviews.find(
            {"user_id": ObjectId(user_id)}
        ).sort("created_at", -1).to_list(length=50)
        
        for review in reviews:
            review["_id"] = str(review["_id"])
            review["user_id"] = str(review["user_id"])
        
        return reviews
    
    async def get_order_reviews(self, order_id: str) -> List[dict]:
        """Get reviews for an order"""
        reviews = await collections.reviews.find(
            {"order_id": order_id}
        ).to_list(length=50)
        
        for review in reviews:
            review["_id"] = str(review["_id"])
            review["user_id"] = str(review["user_id"])
        
        return reviews


# Singleton instance
review_service = ReviewService()
