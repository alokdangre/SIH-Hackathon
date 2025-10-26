from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
import enum

from app.core.db import Base


class EscrowState(str, enum.Enum):
    AWAITING_FUND = "awaiting_fund"
    FUNDED = "funded" 
    AWAITING_DELIVERY = "awaiting_delivery"
    COMPLETE = "complete"
    DISPUTED = "disputed"


class EscrowEventType(str, enum.Enum):
    CREATED = "created"
    FUNDED = "funded"
    DELIVERY_CONFIRMED = "delivery_confirmed"
    RELEASED = "released"
    DISPUTED = "disputed"
    RESOLVED = "resolved"
    TIMEOUT_REFUND = "timeout_refund"


class Escrow(Base):
    __tablename__ = "escrows"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Blockchain data
    onchain_trade_id = Column(Integer, nullable=True, index=True)  # Trade ID from smart contract
    onchain_tx_hash = Column(String(66), nullable=True, index=True)  # Transaction hash
    amount_wei = Column(BigInteger, nullable=False)  # Amount in wei
    
    # State management
    state = Column(String(20), nullable=False, default=EscrowState.AWAITING_FUND, index=True)
    
    # Metadata
    trade_metadata = Column(JSON, nullable=True)  # Additional trade metadata
    dispute_reason = Column(Text, nullable=True)  # Reason for dispute if any
    resolution_notes = Column(Text, nullable=True)  # Admin resolution notes
    
    # Blockchain confirmation tracking
    confirmations = Column(Integer, default=0)  # Number of confirmations
    is_confirmed = Column(Boolean, default=False)  # Whether tx is confirmed
    
    # Timeout handling
    timeout_at = Column(DateTime, nullable=True)  # When escrow times out
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    funded_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    disputed_at = Column(DateTime, nullable=True)
    
    # Relationships
    # contract = relationship("Contract", back_populates="escrows")
    # buyer = relationship("User", foreign_keys=[buyer_id], back_populates="buyer_escrows")
    # seller = relationship("User", foreign_keys=[seller_id], back_populates="seller_escrows")
    events = relationship("EscrowEvent", back_populates="escrow", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Escrow(id={self.id}, contract_id={self.contract_id}, state={self.state})>"

    @property
    def amount_eth(self):
        """Convert wei to ETH for display"""
        return self.amount_wei / 10**18 if self.amount_wei else 0

    @property
    def is_active(self):
        """Check if escrow is in an active state"""
        return self.state in [EscrowState.AWAITING_FUND, EscrowState.FUNDED, EscrowState.DISPUTED]

    @property
    def can_be_funded(self):
        """Check if escrow can be funded"""
        return self.state == EscrowState.AWAITING_FUND

    @property
    def can_confirm_delivery(self):
        """Check if delivery can be confirmed"""
        return self.state == EscrowState.FUNDED

    @property
    def can_raise_dispute(self):
        """Check if dispute can be raised"""
        return self.state == EscrowState.FUNDED

    @property
    def can_timeout_refund(self):
        """Check if timeout refund is available"""
        from datetime import datetime
        return (
            self.state == EscrowState.FUNDED and 
            self.timeout_at and 
            datetime.utcnow() >= self.timeout_at
        )


class EscrowEvent(Base):
    __tablename__ = "escrow_events"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key
    escrow_id = Column(Integer, ForeignKey("escrows.id"), nullable=False, index=True)
    
    # Event data
    event_type = Column(String(30), nullable=False, index=True)
    payload = Column(JSON, nullable=True)  # Event-specific data
    
    # Blockchain data
    tx_hash = Column(String(66), nullable=True, index=True)
    block_number = Column(BigInteger, nullable=True)
    block_hash = Column(String(66), nullable=True)
    log_index = Column(Integer, nullable=True)  # Position in block logs
    
    # Processing status
    is_processed = Column(Boolean, default=False, index=True)
    processed_at = Column(DateTime, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    escrow = relationship("Escrow", back_populates="events")

    def __repr__(self):
        return f"<EscrowEvent(id={self.id}, escrow_id={self.escrow_id}, event_type={self.event_type})>"


