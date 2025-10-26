from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

from app.models.escrow import EscrowState, EscrowEventType


class EscrowCreate(BaseModel):
    contract_id: int = Field(..., description="Contract ID to create escrow for")
    buyer_id: int = Field(..., description="Buyer user ID")
    seller_id: int = Field(..., description="Seller user ID")
    expected_amount_wei: int = Field(..., gt=0, description="Expected amount in wei")
    create_on_chain: bool = Field(default=False, description="Whether to create on-chain immediately")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    @validator('expected_amount_wei')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        # Check reasonable limits (max 1000 ETH)
        if v > 1000 * 10**18:
            raise ValueError('Amount exceeds maximum limit')
        return v


class EscrowFund(BaseModel):
    escrow_id: int = Field(..., description="Escrow ID to fund")
    tx_hash: Optional[str] = Field(default=None, description="Transaction hash if user-provided")
    use_custodial: bool = Field(default=False, description="Use custodial funding")

    @validator('tx_hash')
    def validate_tx_hash(cls, v):
        if v and not v.startswith('0x'):
            raise ValueError('Transaction hash must start with 0x')
        if v and len(v) != 66:
            raise ValueError('Transaction hash must be 66 characters long')
        return v


class EscrowConfirmDelivery(BaseModel):
    escrow_id: int = Field(..., description="Escrow ID")
    use_custodial: bool = Field(default=False, description="Use custodial confirmation")


class EscrowRaiseDispute(BaseModel):
    escrow_id: int = Field(..., description="Escrow ID")
    reason: str = Field(..., min_length=10, max_length=1000, description="Dispute reason")
    evidence_urls: Optional[List[str]] = Field(default=[], description="Evidence URLs")


class EscrowResolveDispute(BaseModel):
    escrow_id: int = Field(..., description="Escrow ID")
    outcome: str = Field(..., description="Dispute outcome: 'refund', 'payout', or 'partial'")
    payout_address: Optional[str] = Field(default=None, description="Address to receive payout")
    payout_amount_wei: Optional[int] = Field(default=None, description="Payout amount in wei")
    resolution_notes: str = Field(..., min_length=10, description="Resolution explanation")

    @validator('outcome')
    def validate_outcome(cls, v):
        if v not in ['refund', 'payout', 'partial']:
            raise ValueError('Outcome must be refund, payout, or partial')
        return v

    @validator('payout_amount_wei')
    def validate_payout_amount(cls, v, values):
        if values.get('outcome') in ['payout', 'partial'] and v is None:
            raise ValueError('Payout amount required for payout/partial outcomes')
        if v and v < 0:
            raise ValueError('Payout amount cannot be negative')
        return v


class EscrowEventCreate(BaseModel):
    escrow_id: int
    event_type: EscrowEventType
    payload: Optional[Dict[str, Any]] = None
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    block_hash: Optional[str] = None
    log_index: Optional[int] = None


class EscrowEventResponse(BaseModel):
    id: int
    escrow_id: int
    event_type: str
    payload: Optional[Dict[str, Any]]
    tx_hash: Optional[str]
    block_number: Optional[int]
    block_hash: Optional[str]
    log_index: Optional[int]
    is_processed: bool
    processed_at: Optional[datetime]
    error_message: Optional[str]
    retry_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class EscrowResponse(BaseModel):
    id: int
    contract_id: int
    buyer_id: int
    seller_id: int
    onchain_trade_id: Optional[int]
    onchain_tx_hash: Optional[str]
    amount_wei: int
    amount_eth: float
    state: str
    trade_metadata: Optional[Dict[str, Any]]
    dispute_reason: Optional[str]
    resolution_notes: Optional[str]
    confirmations: int
    is_confirmed: bool
    timeout_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    funded_at: Optional[datetime]
    completed_at: Optional[datetime]
    disputed_at: Optional[datetime]
    
    # Computed properties
    is_active: bool
    can_be_funded: bool
    can_confirm_delivery: bool
    can_raise_dispute: bool
    can_timeout_refund: bool
    
    # Related data
    events: List[EscrowEventResponse] = []
    
    # Blockchain data
    tx_details: Optional[Dict[str, Any]] = None
    onchain_trade_details: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class EscrowListResponse(BaseModel):
    escrows: List[EscrowResponse]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool


class EscrowCreateResponse(BaseModel):
    escrow_id: int
    onchain_trade_id: Optional[int] = None
    fund_address: Optional[str] = None  # Contract address for funding
    status: str
    tx_hash: Optional[str] = None  # If created on-chain immediately


class EscrowFundResponse(BaseModel):
    escrow_id: int
    status: str
    tx_receipt: Optional[Dict[str, Any]] = None
    confirmations: int
    is_confirmed: bool


class EscrowStatusResponse(BaseModel):
    escrow: EscrowResponse
    blockchain_status: Optional[Dict[str, Any]] = None


class EscrowActionResponse(BaseModel):
    escrow_id: int
    action: str
    status: str
    tx_hash: Optional[str] = None
    message: str


class DisputeListResponse(BaseModel):
    disputes: List[EscrowResponse]
    total: int
    page: int
    limit: int


# Utility schemas
class TransactionDetails(BaseModel):
    hash: str
    from_address: str = Field(alias="from")
    to_address: Optional[str] = Field(alias="to")
    value: int
    gas: int
    gas_price: int = Field(alias="gasPrice")
    block_number: Optional[int] = Field(alias="blockNumber")
    block_hash: Optional[str] = Field(alias="blockHash")
    status: Optional[int]
    confirmations: int
    is_confirmed: bool = Field(alias="isConfirmed")

    class Config:
        allow_population_by_field_name = True


class ContractEventLog(BaseModel):
    event: str
    args: Dict[str, Any]
    transaction_hash: str = Field(alias="transactionHash")
    block_number: int = Field(alias="blockNumber")
    block_hash: str = Field(alias="blockHash")
    log_index: int = Field(alias="logIndex")
    address: str

    class Config:
        allow_population_by_field_name = True
