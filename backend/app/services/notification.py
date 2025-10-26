from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    payload: Optional[dict[str, Any]] = None,
) -> Notification:
    notification = Notification(user_id=user_id, type=notification_type, payload=payload or {})
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
