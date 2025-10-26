from enum import Enum as PyEnum
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship

from app.core.db import Base


class ContractStatus(str, PyEnum):
    draft = "draft"
    offered = "offered"
    accepted = "accepted"
    awaiting_settlement = "awaiting_settlement"
    completed = "completed"
    disputed = "disputed"


class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    qty_kg = Column(Float, nullable=False)
    offer_price_per_kg = Column(Numeric(10, 2), nullable=False)
    status = Column(
        Enum("draft", "offered", "accepted", "awaiting_settlement", "completed", "disputed", name="contract_status"), 
        nullable=False, 
        default="offered"
    )
    expiry_date = Column(DateTime(timezone=True))
    escrow_tx = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    listing = relationship("Listing", back_populates="contracts")
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="buyer_contracts")
    seller = relationship("User", foreign_keys=[seller_id], back_populates="seller_contracts")
    disputes = relationship("Dispute", back_populates="contract", cascade="all,delete-orphan")
    # escrows = relationship("Escrow", back_populates="contract", cascade="all,delete-orphan")