from pydantic import BaseModel


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_prev: bool
