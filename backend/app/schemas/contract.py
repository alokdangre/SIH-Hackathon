from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.contract import ContractStatus
from app.schemas.base import ORMBase


class ContractEvent(BaseModel):
    status: ContractStatus
    actor_id: Optional[int]
    action: str
    timestamp: datetime
    payload: dict = Field(default_factory=dict)


class ContractResponse(ORMBase):
    id: int
    listing_id: int
    buyer_id: int
    seller_id: int
    qty_kg: float
    offer_price_per_kg: float
    status: ContractStatus
    expiry_date: Optional[datetime] = None
    escrow_tx: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    listing_ref: Optional[str] = None
    counterparty_name: Optional[str] = None


class ContractDetailResponse(ContractResponse):
    timeline: List[ContractEvent]


class ContractListResponse(BaseModel):
    contracts: List[ContractResponse]


class ContractCreateRequest(BaseModel):
    listing_id: int
    buyer_id: Optional[int] = None
    qty: float = Field(gt=0)
    offer_price_per_kg: float = Field(gt=0)
    expiry_date: Optional[datetime] = None


class ContractCreateResponse(BaseModel):
    contract_id: int
    status: ContractStatus
    created_at: datetime


class ContractAcceptRequest(BaseModel):
    accepter_id: int


class ContractDisputeRequest(BaseModel):
    reason: str
    evidence_urls: List[str] = Field(default_factory=list)
