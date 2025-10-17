from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.contracts import Contract

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_contracts(db:Session=Depends(get_db)):
    return db.query(Contract).all()

@router.post("/")
def create_contracts(listing_id:int,buyer_id:int,offer_price:float,db:Session=Depends(get_db)):
    new_contract = Contract(listing_id=listing_id,buyer_id=buyer_id,offer_price=offer_price)
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    return new_contract