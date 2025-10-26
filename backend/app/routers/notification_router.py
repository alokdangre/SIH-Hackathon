from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationListResponse,
    NotificationMarkReadRequest,
    NotificationResponse,
)
from app.utils.security import get_current_user

router = APIRouter()


@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    *,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> NotificationListResponse:
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    total_unread = query.filter(Notification.read == False).count()
    
    notifications = (
        query.order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    
    serialized = [NotificationResponse.model_validate(notif) for notif in notifications]
    
    return NotificationListResponse(
        notifications=serialized,
        unread_count=total_unread
    )


@router.post("/mark-read", status_code=status.HTTP_204_NO_CONTENT)
def mark_notifications_read(
    payload: NotificationMarkReadRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not payload.notification_ids:
        return
    
    updated = (
        db.query(Notification)
        .filter(
            Notification.id.in_(payload.notification_ids),
            Notification.user_id == current_user.id
        )
        .update({"read": True}, synchronize_session=False)
    )
    
    if updated == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No notifications found to mark as read"
        )
    
    db.commit()
