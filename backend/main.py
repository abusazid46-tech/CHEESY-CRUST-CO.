# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from datetime import datetime
import logging

from config.settings import settings
from database import connect_to_mongo, close_mongo_connection
from routes import auth, menu, cart, orders, payment, reservation, admin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("Starting up...")
    await connect_to_mongo()
    logger.info("Connected to MongoDB")
    yield
    # Shutdown
    logger.info("Shutting down...")
    await close_mongo_connection()
    logger.info("Disconnected from MongoDB")

app = FastAPI(
    title="Cheesy Crust Co. API",
    description="Restaurant Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(menu.router, prefix="/api/menu", tags=["Menu"])
app.include_router(cart.router, prefix="/api/cart", tags=["Cart"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(payment.router, prefix="/api/payment", tags=["Payment"])
app.include_router(reservation.router, prefix="/api/reservation", tags=["Reservation"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/")
async def root():
    return {"message": "Welcome to Cheesy Crust Co. API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
