from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from datetime import datetime, timedelta
import json

from app.core.db import get_db
from app.models.user import User
from app.models.contract import Contract
from app.models.escrow import Escrow, EscrowEvent, EscrowState, EscrowEventType
from app.schemas.escrow import (
    EscrowCreate, EscrowFund, EscrowConfirmDelivery, EscrowRaiseDispute, EscrowResolveDispute,
    EscrowResponse, EscrowListResponse, EscrowCreateResponse, EscrowFundResponse,
    EscrowStatusResponse, EscrowActionResponse, DisputeListResponse, EscrowEventCreate
)
from app.utils.security import get_current_user, get_current_admin_user
from app.services.web3_service import web3_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["escrow"])


@router.get("/health")
def escrow_health():
    """Health check for escrow endpoints"""
    return {"status": "healthy", "service": "escrow"}


def get_escrow_or_404(escrow_id: int, db: Session) -> Escrow:
    """Get escrow by ID or raise 404"""
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escrow not found"
        )
    return escrow


def check_escrow_access(escrow: Escrow, user: User):
    """Check if user has access to escrow"""
    if user.role == "admin":
        return  # Admins have access to all escrows
    
    if escrow.buyer_id != user.id and escrow.seller_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this escrow"
        )


def create_escrow_event(
    db: Session, 
    escrow_id: int, 
    event_type: EscrowEventType, 
    payload: dict = None,
    tx_hash: str = None,
    block_number: int = None,
    block_hash: str = None,
    log_index: int = None
):
    """Create an escrow event record"""
    event = EscrowEvent(
        escrow_id=escrow_id,
        event_type=event_type,
        payload=payload or {},
        tx_hash=tx_hash,
        block_number=block_number,
        block_hash=block_hash,
        log_index=log_index,
        is_processed=True,
        processed_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    return event


@router.post("/create", response_model=EscrowCreateResponse)
def create_escrow(
    payload: EscrowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new escrow record"""
    
    # Verify contract exists and user has access
    contract = db.query(Contract).filter(Contract.id == payload.contract_id).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    # Check if user is part of the contract
    if contract.buyer_id != current_user.id and contract.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this contract"
        )
    
    # Verify buyer and seller exist
    buyer = db.query(User).filter(User.id == payload.buyer_id).first()
    seller = db.query(User).filter(User.id == payload.seller_id).first()
    
    if not buyer or not seller:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer or seller not found"
        )
    
    # Check if escrow already exists for this contract
    existing_escrow = db.query(Escrow).filter(Escrow.contract_id == payload.contract_id).first()
    if existing_escrow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Escrow already exists for this contract"
        )
    
    # Create escrow record
    timeout_at = datetime.utcnow() + timedelta(days=30)  # 30-day timeout
    
    escrow = Escrow(
        contract_id=payload.contract_id,
        buyer_id=payload.buyer_id,
        seller_id=payload.seller_id,
        amount_wei=payload.expected_amount_wei,
        state=EscrowState.AWAITING_FUND,
        trade_metadata=payload.metadata,
        timeout_at=timeout_at
    )
    
    db.add(escrow)
    db.commit()
    db.refresh(escrow)
    
    # Create escrow event
    create_escrow_event(
        db, escrow.id, EscrowEventType.CREATED,
        payload={
            "contract_id": payload.contract_id,
            "expected_amount_wei": payload.expected_amount_wei,
            "create_on_chain": payload.create_on_chain
        }
    )
    
    response = EscrowCreateResponse(
        escrow_id=escrow.id,
        status="awaiting_fund",
        fund_address=web3_service.contract_address if web3_service.contract_address else None
    )
    
    # If create_on_chain is True and we have custodial capability
    if payload.create_on_chain and web3_service.admin_account:
        try:
            # Create metadata JSON
            metadata_json = json.dumps({
                "escrow_id": escrow.id,
                "contract_id": payload.contract_id,
                **(payload.metadata or {})
            })
            
            success, result = web3_service.create_and_fund_trade_custodial(
                seller.wallet_address if hasattr(seller, 'wallet_address') else seller.email,
                payload.expected_amount_wei,
                metadata_json
            )
            
            if success:
                escrow.onchain_tx_hash = result
                escrow.state = EscrowState.FUNDED
                escrow.funded_at = datetime.utcnow()
                db.commit()
                
                response.tx_hash = result
                response.status = "funded"
                
                # Create funded event
                create_escrow_event(
                    db, escrow.id, EscrowEventType.FUNDED,
                    payload={"tx_hash": result, "custodial": True}
                )
                
            else:
                logger.error(f"Failed to create on-chain trade: {result}")
                
        except Exception as e:
            logger.error(f"Error creating on-chain trade: {e}")
    
    return response


@router.post("/fund", response_model=EscrowFundResponse)
def fund_escrow(
    payload: EscrowFund,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fund an existing escrow"""
    
    escrow = get_escrow_or_404(payload.escrow_id, db)
    check_escrow_access(escrow, current_user)
    
    if escrow.state != EscrowState.AWAITING_FUND:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Escrow is not awaiting funding (current state: {escrow.state})"
        )
    
    # Only buyer can fund
    if escrow.buyer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only buyer can fund escrow"
        )
    
    tx_receipt = None
    
    if payload.use_custodial and web3_service.admin_account:
        # Use custodial funding
        try:
            seller = db.query(User).filter(User.id == escrow.seller_id).first()
            metadata_json = json.dumps({
                "escrow_id": escrow.id,
                "contract_id": escrow.contract_id,
                **(escrow.metadata or {})
            })
            
            success, result = web3_service.create_and_fund_trade_custodial(
                seller.wallet_address if hasattr(seller, 'wallet_address') else seller.email,
                escrow.amount_wei,
                metadata_json
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Custodial funding failed: {result}"
                )
            
            escrow.onchain_tx_hash = result
            
        except Exception as e:
            logger.error(f"Custodial funding error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Custodial funding failed"
            )
    
    elif payload.tx_hash:
        # Verify user-provided transaction
        is_valid, receipt_or_error = web3_service.verify_funding_tx(
            payload.tx_hash,
            escrow.amount_wei,
            web3_service.contract_address
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction verification failed: {receipt_or_error}"
            )
        
        tx_receipt = receipt_or_error
        escrow.onchain_tx_hash = payload.tx_hash
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either tx_hash or use_custodial must be provided"
        )
    
    # Update escrow state
    escrow.state = EscrowState.FUNDED
    escrow.funded_at = datetime.utcnow()
    escrow.is_confirmed = True
    escrow.confirmations = 3  # Assume confirmed if we got here
    
    db.commit()
    
    # Create funded event
    create_escrow_event(
        db, escrow.id, EscrowEventType.FUNDED,
        payload={
            "tx_hash": escrow.onchain_tx_hash,
            "custodial": payload.use_custodial,
            "amount_wei": escrow.amount_wei
        },
        tx_hash=escrow.onchain_tx_hash
    )
    
    return EscrowFundResponse(
        escrow_id=escrow.id,
        status="funded",
        tx_receipt=tx_receipt.__dict__ if tx_receipt else None,
        confirmations=escrow.confirmations,
        is_confirmed=escrow.is_confirmed
    )


@router.get("/{escrow_id}/status", response_model=EscrowStatusResponse)
def get_escrow_status(
    escrow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get escrow status and details"""
    
    escrow = get_escrow_or_404(escrow_id, db)
    check_escrow_access(escrow, current_user)
    
    # Get blockchain status if tx_hash exists
    blockchain_status = None
    if escrow.onchain_tx_hash:
        blockchain_status = web3_service.get_transaction_details(escrow.onchain_tx_hash)
    
    # Convert to response model
    escrow_response = EscrowResponse.from_orm(escrow)
    escrow_response.events = [EscrowEventResponse.from_orm(event) for event in escrow.events]
    
    return EscrowStatusResponse(
        escrow=escrow_response,
        blockchain_status=blockchain_status
    )


@router.post("/{escrow_id}/confirm-delivery", response_model=EscrowActionResponse)
def confirm_delivery(
    escrow_id: int,
    payload: EscrowConfirmDelivery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Confirm delivery for an escrow"""
    
    escrow = get_escrow_or_404(escrow_id, db)
    check_escrow_access(escrow, current_user)
    
    if escrow.state != EscrowState.FUNDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm delivery for escrow in state: {escrow.state}"
        )
    
    tx_hash = None
    
    # If custodial and we have onchain_trade_id, call contract
    if payload.use_custodial and escrow.onchain_trade_id is not None:
        success, result = web3_service.confirm_delivery_custodial(escrow.onchain_trade_id)
        if success:
            tx_hash = result
        else:
            logger.error(f"Custodial delivery confirmation failed: {result}")
    
    # Update escrow state
    escrow.state = EscrowState.COMPLETE
    escrow.completed_at = datetime.utcnow()
    
    db.commit()
    
    # Create delivery confirmed event
    create_escrow_event(
        db, escrow.id, EscrowEventType.DELIVERY_CONFIRMED,
        payload={
            "confirmed_by": current_user.id,
            "custodial": payload.use_custodial,
            "tx_hash": tx_hash
        },
        tx_hash=tx_hash
    )
    
    return EscrowActionResponse(
        escrow_id=escrow.id,
        action="confirm_delivery",
        status="completed",
        tx_hash=tx_hash,
        message="Delivery confirmed successfully"
    )


@router.post("/{escrow_id}/raise-dispute", response_model=EscrowActionResponse)
def raise_dispute(
    escrow_id: int,
    payload: EscrowRaiseDispute,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Raise a dispute for an escrow"""
    
    escrow = get_escrow_or_404(escrow_id, db)
    check_escrow_access(escrow, current_user)
    
    if escrow.state != EscrowState.FUNDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot raise dispute for escrow in state: {escrow.state}"
        )
    
    # Update escrow state
    escrow.state = EscrowState.DISPUTED
    escrow.dispute_reason = payload.reason
    escrow.disputed_at = datetime.utcnow()
    
    db.commit()
    
    # Create dispute event
    create_escrow_event(
        db, escrow.id, EscrowEventType.DISPUTED,
        payload={
            "raised_by": current_user.id,
            "reason": payload.reason,
            "evidence_urls": payload.evidence_urls
        }
    )
    
    return EscrowActionResponse(
        escrow_id=escrow.id,
        action="raise_dispute",
        status="disputed",
        message="Dispute raised successfully"
    )


@router.post("/{escrow_id}/resolve", response_model=EscrowActionResponse)
def resolve_dispute(
    escrow_id: int,
    payload: EscrowResolveDispute,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Resolve a dispute (admin only)"""
    
    escrow = get_escrow_or_404(escrow_id, db)
    
    if escrow.state != EscrowState.DISPUTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resolve dispute for escrow in state: {escrow.state}"
        )
    
    tx_hash = None
    
    # Determine recipient and amount based on outcome
    if payload.outcome == "refund":
        recipient_id = escrow.buyer_id
        amount_wei = escrow.amount_wei
    elif payload.outcome == "payout":
        recipient_id = escrow.seller_id
        amount_wei = escrow.amount_wei
    elif payload.outcome == "partial":
        recipient_id = escrow.buyer_id if payload.payout_address else escrow.seller_id
        amount_wei = payload.payout_amount_wei or 0
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid outcome"
        )
    
    # Get recipient user
    recipient = db.query(User).filter(User.id == recipient_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found"
        )
    
    # If we have onchain trade, resolve on blockchain
    if escrow.onchain_trade_id is not None:
        recipient_address = payload.payout_address or getattr(recipient, 'wallet_address', recipient.email)
        
        success, result = web3_service.resolve_dispute_custodial(
            escrow.onchain_trade_id,
            recipient_address,
            amount_wei,
            payload.resolution_notes
        )
        
        if success:
            tx_hash = result
        else:
            logger.error(f"On-chain dispute resolution failed: {result}")
    
    # Update escrow state
    escrow.state = EscrowState.COMPLETE
    escrow.resolution_notes = payload.resolution_notes
    escrow.completed_at = datetime.utcnow()
    
    db.commit()
    
    # Create resolved event
    create_escrow_event(
        db, escrow.id, EscrowEventType.RESOLVED,
        payload={
            "resolved_by": current_user.id,
            "outcome": payload.outcome,
            "recipient_id": recipient_id,
            "amount_wei": amount_wei,
            "resolution_notes": payload.resolution_notes,
            "tx_hash": tx_hash
        },
        tx_hash=tx_hash
    )
    
    return EscrowActionResponse(
        escrow_id=escrow.id,
        action="resolve_dispute",
        status="resolved",
        tx_hash=tx_hash,
        message=f"Dispute resolved: {payload.outcome}"
    )


@router.get("/", response_model=EscrowListResponse)
def list_escrows(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    state: Optional[str] = Query(None),
    contract_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List escrows for current user"""
    
    query = db.query(Escrow)
    
    # Filter by user access
    if current_user.role != "admin":
        query = query.filter(
            (Escrow.buyer_id == current_user.id) | (Escrow.seller_id == current_user.id)
        )
    
    # Apply filters
    if state:
        query = query.filter(Escrow.state == state)
    
    if contract_id:
        query = query.filter(Escrow.contract_id == contract_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    escrows = query.offset(offset).limit(limit).all()
    
    # Convert to response models
    escrow_responses = []
    for escrow in escrows:
        escrow_response = EscrowResponse.from_orm(escrow)
        escrow_response.events = [EscrowEventResponse.from_orm(event) for event in escrow.events]
        escrow_responses.append(escrow_response)
    
    return EscrowListResponse(
        escrows=escrow_responses,
        total=total,
        page=page,
        limit=limit,
        has_next=(page * limit) < total,
        has_prev=page > 1
    )


@router.get("/admin/disputes", response_model=DisputeListResponse)
def list_disputes(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List disputed escrows (admin only)"""
    
    query = db.query(Escrow).filter(Escrow.state == EscrowState.DISPUTED)
    
    total = query.count()
    offset = (page - 1) * limit
    disputes = query.offset(offset).limit(limit).all()
    
    # Convert to response models
    dispute_responses = []
    for dispute in disputes:
        dispute_response = EscrowResponse.from_orm(dispute)
        dispute_response.events = [EscrowEventResponse.from_orm(event) for event in dispute.events]
        dispute_responses.append(dispute_response)
    
    return DisputeListResponse(
        disputes=dispute_responses,
        total=total,
        page=page,
        limit=limit
    )
