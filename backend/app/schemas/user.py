from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import EmailStr, Field

from app.schemas.base import ORMBase

UserRole = Literal["farmer", "buyer", "admin"]


class UserBase(ORMBase):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    kyc_status: str
    kyc_document_url: Optional[str] = None
    wallet_address: Optional[str] = None
    profile_data: Optional[dict[str, Any]] = Field(default=None)
    created_at: datetime


class UserCreateRequest(ORMBase):
    name: str
    email: EmailStr
    password: str
    role: UserRole = "farmer"


class UserResponse(UserBase):
    pass
