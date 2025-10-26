from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.db import Base, engine
from app.models import audit_log, contract, dispute, listing, notification, price_history, user
from app.routers import admin_router, auth_router, contract_router, listing_router, notification_router, webhook_router

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/auth", tags=["Auth"])
app.include_router(listing_router.router, prefix="/listings", tags=["Listings"])
app.include_router(contract_router.router, prefix="/contracts", tags=["Contracts"])
app.include_router(notification_router.router, prefix="/notifications", tags=["Notifications"])
app.include_router(webhook_router.router, prefix="/webhook", tags=["Webhook"])
app.include_router(admin_router.router, prefix="/admin", tags=["Admin"])

app.mount("/media", StaticFiles(directory=settings.media_root), name="media")