from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="farmer")
    kyc_status = Column(String, nullable=False, default="pending")
    kyc_document_url = Column(String)
    wallet_address = Column(String)
    profile_data = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    listings = relationship("Listing", back_populates="seller", cascade="all,delete")
    buyer_contracts = relationship("Contract", foreign_keys="Contract.buyer_id", back_populates="buyer")
    seller_contracts = relationship("Contract", foreign_keys="Contract.seller_id", back_populates="seller")
    notifications = relationship("Notification", back_populates="user", cascade="all,delete")
    disputes_raised = relationship("Dispute", back_populates="raised_by", cascade="all,delete")