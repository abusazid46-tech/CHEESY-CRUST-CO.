# backend/routes/auth.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse, UserResponse
from services.auth_service import AuthService
from dependencies import get_current_user

router = APIRouter()
auth_service = AuthService()
security = HTTPBearer()

@router.post("/send-otp", status_code=status.HTTP_200_OK)
async def send_otp(request: SendOTPRequest):
    """Send OTP to user's phone number"""
    # Validate phone number format (basic validation)
    if not request.phone or len(request.phone) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number"
        )
    
    otp = await auth_service.send_otp(request.phone)
    
    return {
        "message": "OTP sent successfully",
        "debug_otp": otp  # Remove in production
    }

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and return JWT token"""
    if not request.phone or not request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number and OTP are required"
        )
    
    user = await auth_service.verify_otp(request.phone, request.otp)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP"
        )
    
    token = auth_service.create_jwt_token(user["_id"], user.get("is_admin", False))
    
    return TokenResponse(
        access_token=token,
        user_id=str(user["_id"]),
        is_admin=user.get("is_admin", False)
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=str(current_user["_id"]),
        phone=current_user["phone"],
        name=current_user.get("name"),
        email=current_user.get("email"),
        is_admin=current_user.get("is_admin", False)
    )
