from enum import Enum

from sqlalchemy import JSON, Column, DateTime, Enum as SQLEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.db import Base


class ListingStatus(str, Enum):
    active = "active"
    closed = "closed"
    draft = "draft"


class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    commodity = Column(String, nullable=False)
    variety = Column(String)
    qty_kg = Column(Float, nullable=False)
    price_per_kg = Column(Float, nullable=False)
    moisture_pct = Column(Float)
    quality_notes = Column(Text)
    photos = Column(JSON, default=list)
    location = Column(String)
    status = Column(
        SQLEnum("active", "closed", "draft", name="listing_status"), nullable=False, default="active"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    seller = relationship("User", back_populates="listings")
    contracts = relationship("Contract", back_populates="listing", cascade="all,delete")