from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel

from app.schemas.base import ORMBase


class NotificationResponse(ORMBase):
    id: int
    user_id: int
    type: str
    payload: Dict[str, Any]
    read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int


class NotificationMarkReadRequest(BaseModel):
    notification_ids: List[int]
