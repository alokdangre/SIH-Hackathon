from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, func

from app.core.db import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String, nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    payload = Column(JSON, nullable=False, default=dict)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
