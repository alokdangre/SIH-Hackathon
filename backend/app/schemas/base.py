from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


class TimestampMixin(BaseModel):
    created_at: datetime


class TimestampWithUpdateMixin(TimestampMixin):
    updated_at: datetime
