from enum import Enum

from sqlalchemy import JSON, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.core.db import Base


class DisputeStatus(str, Enum):
    open = "OPEN"
    resolved = "RESOLVED"
    dismissed = "DISMISSED"


class Dispute(Base):
    __tablename__ = "disputes"
    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    raised_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(String, nullable=False)
    evidence_urls = Column(JSON, default=list)
    status = Column(SQLEnum(DisputeStatus, name="dispute_status"), default=DisputeStatus.open, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    contract = relationship("Contract", back_populates="disputes")
    raised_by = relationship("User", back_populates="disputes_raised")
