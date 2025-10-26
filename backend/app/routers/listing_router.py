from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.models.contract import Contract, ContractStatus
from app.models.listing import Listing, ListingStatus
from app.schemas.listing import (
    ListingCreatePayload,
    ListingDetailResponse,
    ListingListResponse,
    ListingOffersSummary,
    ListingResponse,
)
from app.schemas.common import PaginationMeta
from app.services.audit import log_action
from app.utils.file_storage import save_upload_files
from app.utils.security import get_current_user, require_role

router = APIRouter()


def _seller_alias(listing: Listing) -> str:
    return f"Farmer #{listing.seller_id:03d}"


def _serialize_listing(listing: Listing) -> ListingResponse:
    data = jsonable_encoder(listing, exclude={"seller"})
    data.update(
        {
            "seller_alias": _seller_alias(listing),
            "photos": listing.photos or [],
        }
    )
    return ListingResponse(**data)


def _serialize_listing_detail(listing: Listing) -> ListingDetailResponse:
    offers = listing.contracts or []
    last_offer = None
    if offers:
        last_offer = max(
            offers,
            key=lambda contract: contract.created_at or contract.updated_at or listing.created_at,
        )
    summary = ListingOffersSummary(
        total_offers=len(offers),
        active_offers=sum(1 for offer in offers if offer.status == ContractStatus.offered),
        last_offer_status=last_offer.status if last_offer else None,
    )
    base = _serialize_listing(listing).model_dump()
    base.update({"offers_summary": summary})
    return ListingDetailResponse(**base)


@router.get("/", response_model=ListingListResponse)
def list_listings(
    *,
    db: Session = Depends(get_db),
    commodity: Optional[str] = Query(default=None),
    min_qty: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    location: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> ListingListResponse:
    query = db.query(Listing).options(joinedload(Listing.seller)).filter(Listing.status == ListingStatus.active)

    if commodity:
        query = query.filter(func.lower(Listing.commodity) == commodity.lower())
    if min_qty is not None:
        query = query.filter(Listing.qty_kg >= min_qty)
    if max_price is not None:
        query = query.filter(Listing.price_per_kg <= max_price)
    if location:
        query = query.filter(func.lower(Listing.location).like(f"%{location.lower()}%"))

    total = query.count()
    pages = max((total + limit - 1) // limit, 1)
    if page > pages:
        page = pages

    listings = (
        query.order_by(Listing.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    serialized = [_serialize_listing(listing) for listing in listings]
    meta = PaginationMeta(
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1,
    )
    return ListingListResponse(listings=serialized, meta=meta)


@router.post("/", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_listing(
    *,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("farmer")),
    commodity: str = Form(...),
    variety: Optional[str] = Form(default=None),
    qty_kg: float = Form(..., gt=0),
    price_per_kg: float = Form(..., gt=0),
    moisture_pct: Optional[float] = Form(default=None),
    quality_notes: Optional[str] = Form(default=None),
    location: Optional[str] = Form(default=None),
    photos: Optional[List[UploadFile]] = File(default=None),
) -> ListingResponse:
    payload = ListingCreatePayload(
        commodity=commodity,
        variety=variety,
        qty_kg=qty_kg,
        price_per_kg=price_per_kg,
        moisture_pct=moisture_pct,
        quality_notes=quality_notes,
        location=location,
    )

    listing = Listing(
        seller_id=current_user.id,
        commodity=payload.commodity,
        variety=payload.variety,
        qty_kg=payload.qty_kg,
        price_per_kg=payload.price_per_kg,
        moisture_pct=payload.moisture_pct,
        quality_notes=payload.quality_notes,
        location=payload.location,
        status=ListingStatus.active,
    )

    if photos:
        saved = save_upload_files(photos, f"listings/{current_user.id}")
        listing.photos = saved

    db.add(listing)
    db.commit()
    db.refresh(listing)

    log_action(
        db,
        entity_type="listing",
        entity_id=listing.id,
        action="created",
        actor_id=current_user.id,
        payload={"qty_kg": listing.qty_kg, "price_per_kg": listing.price_per_kg},
    )

    return _serialize_listing(listing)


@router.get("/{listing_id}", response_model=ListingDetailResponse)
def get_listing_detail(listing_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)) -> ListingDetailResponse:
    listing = (
        db.query(Listing)
        .options(joinedload(Listing.contracts), joinedload(Listing.seller))
        .filter(Listing.id == listing_id)
        .first()
    )

    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.status != ListingStatus.active and listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Listing unavailable")

    return _serialize_listing_detail(listing)