from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.models.audit_log import AuditLog
from app.models.contract import Contract, ContractStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.listing import Listing, ListingStatus
from app.models.user import User
from app.schemas.contract import (
    ContractAcceptRequest,
    ContractCreateRequest,
    ContractCreateResponse,
    ContractDetailResponse,
    ContractDisputeRequest,
    ContractEvent,
    ContractListResponse,
    ContractResponse,
)
from app.services.audit import log_action
from app.services.notification import create_notification
from app.utils.security import get_current_user, require_role

router = APIRouter()


def _contract_to_response(contract: Contract, current_user: User) -> ContractResponse:
    listing_ref = f"Listing #{contract.listing_id:04d}"
    if current_user.id == contract.buyer_id:
        counterparty_name = f"Farmer #{contract.seller_id:03d}"
    elif current_user.id == contract.seller_id:
        counterparty_name = f"Buyer #{contract.buyer_id:03d}"
    else:
        counterparty_name = None

    data = jsonable_encoder(contract, exclude={"listing", "buyer", "seller", "disputes"})
    data.update(
        {
            "listing_ref": listing_ref,
            "counterparty_name": counterparty_name,
        }
    )
    return ContractResponse(**data)


def _timeline_for_contract(db: Session, contract_id: int) -> List[ContractEvent]:
    events = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == "contract", AuditLog.entity_id == contract_id)
        .order_by(AuditLog.timestamp.asc())
        .all()
    )
    timeline: List[ContractEvent] = []
    for event in events:
        status_value = event.payload.get("status") if event.payload else None
        status = ContractStatus(status_value) if status_value else ContractStatus.offered
        timeline.append(
            ContractEvent(
                status=status,
                actor_id=event.actor_id,
                action=event.action,
                timestamp=event.timestamp,
                payload=event.payload or {},
            )
        )
    return timeline


@router.post("/", response_model=ContractCreateResponse, status_code=status.HTTP_201_CREATED)
def create_contract(
    payload: ContractCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("buyer")),
) -> ContractCreateResponse:
    listing = (
        db.query(Listing)
        .options(joinedload(Listing.seller))
        .filter(Listing.id == payload.listing_id, Listing.status == ListingStatus.active)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not available")
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot make offer on own listing")

    if payload.qty > listing.qty_kg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity exceeds listing availability")

    buyer_id = payload.buyer_id or current_user.id
    if buyer_id != current_user.id:
        # allow admins only to set buyer_id explicitly
        if current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create offer for another user")

    contract = Contract(
        listing_id=listing.id,
        buyer_id=buyer_id,
        seller_id=listing.seller_id,
        qty_kg=payload.qty,
        offer_price_per_kg=payload.offer_price_per_kg,
        status=ContractStatus.offered,
        expiry_date=payload.expiry_date,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    log_action(
        db,
        entity_type="contract",
        entity_id=contract.id,
        action="offer_created",
        actor_id=current_user.id,
        payload={"status": contract.status, "qty_kg": contract.qty_kg},
    )

    create_notification(
        db,
        user_id=listing.seller_id,
        notification_type="offer-created",
        payload={"contract_id": contract.id, "listing_id": listing.id},
    )

    return ContractCreateResponse(contract_id=contract.id, status=contract.status, created_at=contract.created_at)


@router.get("/", response_model=ContractListResponse)
def list_contracts(
    *,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    user_id: Optional[int] = Query(default=None),
) -> ContractListResponse:
    target_user_id = user_id or current_user.id
    if target_user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view these contracts")

    contracts = (
        db.query(Contract)
        .options(joinedload(Contract.listing))
        .filter((Contract.buyer_id == target_user_id) | (Contract.seller_id == target_user_id))
        .order_by(Contract.created_at.desc())
        .all()
    )

    response_items = [_contract_to_response(contract, current_user) for contract in contracts]
    return ContractListResponse(contracts=response_items)


@router.get("/{contract_id}", response_model=ContractDetailResponse)
def get_contract_detail(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ContractDetailResponse:
    contract = (
        db.query(Contract)
        .options(joinedload(Contract.listing))
        .filter(Contract.id == contract_id)
        .first()
    )
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    if current_user.id not in {contract.buyer_id, contract.seller_id} and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view contract")

    response = _contract_to_response(contract, current_user).model_dump()
    timeline = _timeline_for_contract(db, contract.id)
    response.update({"timeline": timeline})
    return ContractDetailResponse(**response)


def _update_contract_status(
    db: Session,
    *,
    contract: Contract,
    new_status: ContractStatus,
    actor: User,
    action: str,
    notification_user_id: Optional[int] = None,
    notification_type: Optional[str] = None,
    notification_payload: Optional[dict] = None,
) -> Contract:
    contract.status = new_status
    contract.updated_at = datetime.utcnow()
    db.add(contract)
    db.commit()
    db.refresh(contract)

    log_action(
        db,
        entity_type="contract",
        entity_id=contract.id,
        action=action,
        actor_id=actor.id,
        payload={"status": contract.status},
    )

    if notification_user_id and notification_type:
        create_notification(
            db,
            user_id=notification_user_id,
            notification_type=notification_type,
            payload=notification_payload or {"contract_id": contract.id},
        )

    return contract


@router.post("/{contract_id}/accept", response_model=ContractResponse)
def accept_contract(
    contract_id: int,
    payload: ContractAcceptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("farmer", "admin")),
) -> ContractResponse:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    if contract.seller_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only seller can accept offer")
    if contract.status != ContractStatus.offered:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract not in offered state")
    if payload.accepter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid accepter")

    contract = _update_contract_status(
        db,
        contract=contract,
        new_status=ContractStatus.accepted,
        actor=current_user,
        action="offer_accepted",
        notification_user_id=contract.buyer_id,
        notification_type="offer-accepted",
    )

    return _contract_to_response(contract, current_user)


@router.post("/{contract_id}/confirm-delivery", response_model=ContractResponse)
def confirm_delivery(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("farmer", "admin")),
) -> ContractResponse:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    if contract.seller_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only seller can confirm delivery")
    if contract.status not in {ContractStatus.accepted, ContractStatus.awaiting_settlement}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract not ready for completion")

    contract = _update_contract_status(
        db,
        contract=contract,
        new_status=ContractStatus.completed,
        actor=current_user,
        action="delivery_confirmed",
        notification_user_id=contract.buyer_id,
        notification_type="contract-completed",
    )

    return _contract_to_response(contract, current_user)


@router.post("/{contract_id}/raise-dispute", response_model=ContractResponse)
def raise_dispute(
    contract_id: int,
    payload: ContractDisputeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ContractResponse:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    if current_user.id not in {contract.buyer_id, contract.seller_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a party to this contract")

    dispute = Dispute(
        contract_id=contract.id,
        raised_by_id=current_user.id,
        reason=payload.reason,
        evidence_urls=payload.evidence_urls,
        status=DisputeStatus.open,
    )
    contract.status = ContractStatus.disputed
    db.add(dispute)
    db.add(contract)
    db.commit()
    db.refresh(contract)

    log_action(
        db,
        entity_type="contract",
        entity_id=contract.id,
        action="dispute_raised",
        actor_id=current_user.id,
        payload={"status": contract.status.value, "dispute_id": dispute.id},
    )

    counterparty_id = contract.buyer_id if current_user.id == contract.seller_id else contract.seller_id
    create_notification(
        db,
        user_id=counterparty_id,
        notification_type="contract-disputed",
        payload={"contract_id": contract.id, "dispute_id": dispute.id},
    )

    return _contract_to_response(contract, current_user)