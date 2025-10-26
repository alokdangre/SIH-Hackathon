from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.audit_log import AuditLog
from app.schemas.base import ORMBase
from app.utils.security import require_role

router = APIRouter()


class AuditLogResponse(ORMBase):
    id: int
    entity_type: str
    entity_id: int
    action: str
    actor_id: int | None
    payload: dict
    timestamp: str


@router.get("/audit/{contract_id}", response_model=List[AuditLogResponse])
def get_contract_audit_logs(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),
) -> List[AuditLogResponse]:
    """Admin only - returns append-only logs for a contract."""
    
    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == "contract",
            AuditLog.entity_id == contract_id
        )
        .order_by(AuditLog.timestamp.asc())
        .all()
    )
    
    if not logs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No audit logs found for this contract"
        )
    
    return [
        AuditLogResponse(
            id=log.id,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            action=log.action,
            actor_id=log.actor_id,
            payload=log.payload or {},
            timestamp=log.timestamp.isoformat()
        )
        for log in logs
    ]
