from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.contract import ContractStatus
from app.models.listing import ListingStatus
from app.schemas.base import ORMBase
from app.schemas.common import PaginationMeta


class ListingOffersSummary(BaseModel):
    total_offers: int = 0
    active_offers: int = 0
    last_offer_status: Optional[ContractStatus] = None


class ListingResponse(ORMBase):
    id: int
    commodity: str
    variety: Optional[str] = None
    qty_kg: float
    price_per_kg: float
    moisture_pct: Optional[float] = None
    quality_notes: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    status: ListingStatus
    seller_id: int
    seller_alias: str
    created_at: datetime
    updated_at: datetime


class ListingDetailResponse(ListingResponse):
    offers_summary: ListingOffersSummary


class ListingListResponse(BaseModel):
    listings: List[ListingResponse]
    meta: PaginationMeta


class ListingCreatePayload(BaseModel):
    commodity: str
    variety: Optional[str] = None
    qty_kg: float = Field(gt=0)
    price_per_kg: float = Field(gt=0)
    moisture_pct: Optional[float] = Field(default=None, ge=0, le=100)
    quality_notes: Optional[str] = None
    location: Optional[str] = None
