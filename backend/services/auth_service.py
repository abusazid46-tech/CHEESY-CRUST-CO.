"""
Authentication service - OTP and JWT handling
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
import logging

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from config.settings import settings
from database import db, collections
from models.user import User, OTPSession
from utils.security import generate_otp, validate_phone, create_access_token, create_refresh_token

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service class"""
    
    def __init__(self):
        self.twilio_client = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.twilio_client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
    
    async def send_otp(self, phone: str) -> Tuple[bool, str, Optional[str]]:
        """
        Generate and send OTP to phone number
        
        Returns:
            Tuple[success, message, otp_code_or_none]
        """
        try:
            phone = validate_phone(phone)
        except ValueError as e:
            return False, str(e), None
        
        # Check cooldown
        recent_session = await collections.otp_sessions.find_one({
            "phone": phone,
            "created_at": {"$gt": datetime.utcnow() - timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS)}
        })
        
        if recent_session:
            wait_time = settings.OTP_RESEND_COOLDOWN_SECONDS - int(
                (datetime.utcnow() - recent_session["created_at"]).total_seconds()
            )
            return False, f"Please wait {wait_time} seconds before requesting another OTP", None
        
        # Generate OTP
        otp = generate_otp(settings.OTP_LENGTH)
        
        # Create OTP session
        otp_session = OTPSession.create(
            phone=phone,
            otp=otp,
            expiry_minutes=settings.OTP_EXPIRE_MINUTES
        )
        
        # Delete old sessions for this phone
        await collections.otp_sessions.delete_many({"phone": phone})
        
        # Save new session
        await collections.otp_sessions.insert_one(otp_session.model_dump(by_alias=True))
        
        # Send OTP via SMS
        if settings.OTP_DEMO_MODE:
            logger.info(f"[DEMO] OTP for {phone}: {otp}")
            return True, "OTP sent successfully (Demo Mode)", otp
        
        if self.twilio_client and settings.TWILIO_VERIFY_SERVICE_SID:
            try:
                # Use Twilio Verify service
                self.twilio_client.verify.v2.services(
                    settings.TWILIO_VERIFY_SERVICE_SID
                ).verifications.create(to=phone, channel="sms")
                return True, "OTP sent successfully", None
            except TwilioRestException as e:
                logger.error(f"Twilio error: {e}")
                return False, "Failed to send OTP via SMS", None
        elif self.twilio_client and settings.TWILIO_PHONE_NUMBER:
            try:
                # Direct SMS
                message = self.twilio_client.messages.create(
                    body=f"Your Cheesy Crust Co. verification code is: {otp}. Valid for {settings.OTP_EXPIRE_MINUTES} minutes.",
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=phone
                )
                logger.info(f"SMS sent: {message.sid}")
                return True, "OTP sent successfully", None
            except TwilioRestException as e:
                logger.error(f"Twilio error: {e}")
                return False, "Failed to send OTP via SMS", None
        else:
            # No SMS provider configured - fallback to console
            logger.info(f"[CONSOLE] OTP for {phone}: {otp}")
            return True, "OTP logged to console", otp
    
    async def verify_otp(self, phone: str, otp: str) -> Tuple[bool, str, Optional[dict]]:
        """
        Verify OTP and return JWT tokens if valid
        
        Returns:
            Tuple[success, message, tokens_or_none]
        """
        try:
            phone = validate_phone(phone)
        except ValueError as e:
            return False, str(e), None
        
        # Find OTP session
        otp_session_doc = await collections.otp_sessions.find_one({"phone": phone})
        
        if not otp_session_doc:
            return False, "No OTP request found. Please request a new OTP.", None
        
        otp_session = OTPSession(**otp_session_doc)
        
        # Check if already verified (for Twilio Verify)
        if settings.TWILIO_VERIFY_SERVICE_SID and self.twilio_client:
            try:
                verification_check = self.twilio_client.verify.v2.services(
                    settings.TWILIO_VERIFY_SERVICE_SID
                ).verification_checks.create(to=phone, code=otp)
                
                if verification_check.status == "approved":
                    otp_session.verified = True
                else:
                    return False, "Invalid OTP", None
            except TwilioRestException as e:
                logger.error(f"Twilio verify error: {e}")
                return False, "Invalid OTP", None
        else:
            # Standard OTP verification
            if not otp_session.verify(otp):
                if otp_session.attempts >= 3:
                    await collections.otp_sessions.delete_one({"phone": phone})
                    return False, "Too many attempts. Please request a new OTP.", None
                
                await collections.otp_sessions.update_one(
                    {"phone": phone},
                    {"$set": {"attempts": otp_session.attempts}}
                )
                return False, "Invalid OTP", None
        
        # OTP verified - find or create user
        user_doc = await collections.users.find_one({"phone": phone})
        
        if not user_doc:
            # Create new user
            user = User(
                phone=phone,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            result = await collections.users.insert_one(user.model_dump(by_alias=True))
            user.id = result.inserted_id
            is_admin = False
        else:
            user = User(**user_doc)
            is_admin = user.is_admin
        
        # Mark OTP as verified
        await collections.otp_sessions.update_one(
            {"phone": phone},
            {"$set": {"verified": True}}
        )
        
        # Generate JWT tokens
        token_data = {
            "sub": str(user.id),
            "phone": user.phone,
            "is_admin": is_admin
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        tokens = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user_id": str(user.id),
            "phone": user.phone,
            "name": user.name,
            "is_admin": is_admin
        }
        
        return True, "OTP verified successfully", tokens
    
    async def refresh_token(self, refresh_token: str) -> Tuple[bool, str, Optional[dict]]:
        """Refresh access token using refresh token"""
        from utils.security import decode_token
        
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return False, "Invalid refresh token", None
        
        user_id = payload.get("sub")
        if not user_id:
            return False, "Invalid token payload", None
        
        # Check if user exists
        from bson import ObjectId
        user = await collections.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return False, "User not found", None
        
        # Generate new tokens
        token_data = {
            "sub": user_id,
            "phone": user["phone"],
            "is_admin": user.get("is_admin", False)
        }
        
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)
        
        tokens = {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user_id": user_id,
            "phone": user["phone"],
            "name": user.get("name"),
            "is_admin": user.get("is_admin", False)
        }
        
        return True, "Token refreshed", tokens


# Singleton instance
auth_service = AuthService()
