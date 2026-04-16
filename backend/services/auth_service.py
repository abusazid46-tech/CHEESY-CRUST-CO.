# backend/services/auth_service.py
import random
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from bson import ObjectId

from config.settings import settings
from database import get_database
from models.user import User, OTPSession

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self):
        self.db = get_database()
    
    def generate_otp(self):
        """Generate 6-digit OTP"""
        return str(random.randint(100000, 999999))
    
    async def send_otp(self, phone: str):
        """Send OTP to phone number (mock implementation)"""
        otp = self.generate_otp()
        
        # Store OTP in database
        otp_session = OTPSession(
            phone=phone,
            otp=otp,
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        
        await self.db.otp_sessions.insert_one(otp_session.dict())
        
        # Mock OTP sending - log to console
        print(f"📱 OTP for {phone}: {otp}")
        
        # In production, integrate with SMS service like Twilio, MSG91, etc.
        return otp
    
    async def verify_otp(self, phone: str, otp: str):
        """Verify OTP and return user"""
        # Find valid OTP session
        session = await self.db.otp_sessions.find_one({
            "phone": phone,
            "otp": otp,
            "verified": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not session:
            return None
        
        # Mark as verified
        await self.db.otp_sessions.update_one(
            {"_id": session["_id"]},
            {"$set": {"verified": True}}
        )
        
        # Get or create user
        user = await self.db.users.find_one({"phone": phone})
        
        if not user:
            # Create new user
            new_user = User(phone=phone)
            result = await self.db.users.insert_one(new_user.dict())
            user = await self.db.users.find_one({"_id": result.inserted_id})
        else:
            # Update last login
            await self.db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
        
        return user
    
    def create_jwt_token(self, user_id: str, is_admin: bool = False):
        """Create JWT token for user"""
        expiration = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
        
        payload = {
            "user_id": str(user_id),
            "is_admin": is_admin,
            "exp": expiration,
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        return token
    
    async def verify_jwt_token(self, token: str):
        """Verify JWT token and return user info"""
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
