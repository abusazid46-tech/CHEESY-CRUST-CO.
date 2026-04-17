"""
Utility helper functions
"""

from datetime import datetime, date, time, timedelta
from typing import Optional, List
import random
import string


def generate_id(prefix: str = "", length: int = 8) -> str:
    """Generate random ID with optional prefix"""
    chars = string.ascii_uppercase + string.digits
    random_str = ''.join(random.choices(chars, k=length))
    return f"{prefix}{random_str}" if prefix else random_str


def format_phone_display(phone: str) -> str:
    """Format phone number for display"""
    import re
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 12 and digits.startswith("91"):
        return f"+91 {digits[2:7]} {digits[7:]}"
    elif len(digits) == 10:
        return f"+91 {digits[:5]} {digits[5:]}"
    return phone


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in km (Haversine formula)"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth radius in km
    
    lat1, lon1 = radians(lat1), radians(lon1)
    lat2, lon2 = radians(lat2), radians(lon2)
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def get_time_slots(
    start_time: str = "11:00",
    end_time: str = "22:30",
    interval_minutes: int = 30
) -> List[str]:
    """Generate available time slots"""
    slots = []
    current = datetime.strptime(start_time, "%H:%M")
    end = datetime.strptime(end_time, "%H:%M")
    
    while current <= end:
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=interval_minutes)
    
    return slots


def is_valid_reservation_time(reservation_time: str) -> bool:
    """Check if time is within restaurant hours"""
    time_obj = datetime.strptime(reservation_time, "%H:%M").time()
    opening = time(11, 0)
    closing = time(22, 30)
    return opening <= time_obj <= closing


def paginate(items: List, page: int = 1, per_page: int = 20) -> dict:
    """Paginate a list of items"""
    total = len(items)
    total_pages = (total + per_page - 1) // per_page
    
    start = (page - 1) * per_page
    end = start + per_page
    
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
