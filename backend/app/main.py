from fastapi import FastAPI
from app.core.db import Base, engine
from app.models import user, listing, contract
from app.routers import listing_router, contract_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Oilseed Hedging Backend")

app.include_router(listing_router.router, prefix="/listings", tags=["Listings"])
app.include_router(contract_router.router, prefix="/contracts", tags=["Contracts"])