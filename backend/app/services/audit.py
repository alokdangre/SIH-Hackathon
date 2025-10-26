from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    *,
    entity_type: str,
    entity_id: int,
    action: str,
    actor_id: Optional[int] = None,
    payload: Optional[dict[str, Any]] = None,
) -> AuditLog:
    audit = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        payload=payload or {},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit
