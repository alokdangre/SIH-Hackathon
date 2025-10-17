from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.listing import Listing

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_listing(db: Session=Depends(get_db)):
    return db.query(Listing).all()

@router.post("/")
def create_listing(commodity: str,quantity: float,price: float,location: str,db: Session= Depends(get_db)):
    new_listing = Listing(commodity=commodity, quantity=quantity, price=price, location=location)
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    return new_listing