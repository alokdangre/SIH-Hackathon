from datetime import date
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.models.price_history import PriceHistory

router = APIRouter()
settings = get_settings()


class PriceUpdatePayload(BaseModel):
    commodity: str
    price_per_kg: float
    recorded_on: date


class PriceFeedRequest(BaseModel):
    prices: List[PriceUpdatePayload]


def verify_price_feed_secret(x_secret: str = Header(..., alias="X-Price-Feed-Secret")):
    if x_secret != settings.price_feed_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid price feed secret"
        )
    return True


@router.post("/price", status_code=status.HTTP_201_CREATED)
def ingest_price_feed(
    payload: PriceFeedRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_price_feed_secret),
):
    """Internal price feed ingestion endpoint for prototype seeded data."""
    
    for price_data in payload.prices:
        # Check if price already exists for this commodity and date
        existing = (
            db.query(PriceHistory)
            .filter(
                PriceHistory.commodity == price_data.commodity,
                PriceHistory.recorded_on == price_data.recorded_on
            )
            .first()
        )
        
        if existing:
            # Update existing price
            existing.price_per_kg = price_data.price_per_kg
            db.add(existing)
        else:
            # Create new price record
            price_record = PriceHistory(
                commodity=price_data.commodity,
                price_per_kg=price_data.price_per_kg,
                recorded_on=price_data.recorded_on
            )
            db.add(price_record)
    
    db.commit()
    
    return {"message": f"Processed {len(payload.prices)} price updates"}
