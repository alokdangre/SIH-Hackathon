import os
import time
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.escrow import Escrow, EscrowEvent, EscrowState, EscrowEventType
from app.services.web3_service import web3_service

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup for worker
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


class EventProcessor:
    """Background worker to process blockchain events"""
    
    def __init__(self):
        self.last_processed_block = self._get_last_processed_block()
        self.poll_interval = int(os.getenv("EVENT_POLL_INTERVAL", "10"))  # seconds
        self.batch_size = int(os.getenv("EVENT_BATCH_SIZE", "100"))  # blocks per batch
        self.max_retries = int(os.getenv("EVENT_MAX_RETRIES", "3"))
        
    def _get_last_processed_block(self) -> int:
        """Get the last processed block number from database or start from recent"""
        try:
            with SessionLocal() as db:
                # Get the highest block number from processed events
                last_event = db.query(EscrowEvent).filter(
                    EscrowEvent.block_number.isnot(None)
                ).order_by(EscrowEvent.block_number.desc()).first()
                
                if last_event and last_event.block_number:
                    return last_event.block_number
                
                # If no events, start from current block minus some buffer
                current_block = web3_service.get_current_block()
                return max(0, current_block - 1000)  # Start from 1000 blocks ago
                
        except Exception as e:
            logger.error(f"Error getting last processed block: {e}")
            # Fallback to current block
            return web3_service.get_current_block()

    def process_events(self):
        """Main event processing loop"""
        logger.info("Starting event processor...")
        
        while True:
            try:
                current_block = web3_service.get_current_block()
                
                if self.last_processed_block >= current_block:
                    logger.debug(f"No new blocks to process. Current: {current_block}, Last processed: {self.last_processed_block}")
                    time.sleep(self.poll_interval)
                    continue
                
                # Process blocks in batches
                to_block = min(self.last_processed_block + self.batch_size, current_block)
                
                logger.info(f"Processing blocks {self.last_processed_block + 1} to {to_block}")
                
                # Get events from blockchain
                events = web3_service.get_contract_events(
                    from_block=self.last_processed_block + 1,
                    to_block=to_block
                )
                
                if events:
                    logger.info(f"Found {len(events)} events to process")
                    self._process_event_batch(events)
                
                # Update last processed block
                self.last_processed_block = to_block
                
                # Short pause between batches
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error in event processing loop: {e}")
                time.sleep(self.poll_interval)

    def _process_event_batch(self, events: List[Dict[str, Any]]):
        """Process a batch of events"""
        with SessionLocal() as db:
            for event in events:
                try:
                    self._process_single_event(db, event)
                except Exception as e:
                    logger.error(f"Error processing event {event.get('transactionHash', 'unknown')}: {e}")
                    continue
            
            db.commit()

    def _process_single_event(self, db: Session, event: Dict[str, Any]):
        """Process a single blockchain event"""
        event_name = event['event']
        event_args = event['args']
        tx_hash = event['transactionHash']
        block_number = event['blockNumber']
        block_hash = event['blockHash']
        log_index = event['logIndex']
        
        # Check if event already processed
        existing_event = db.query(EscrowEvent).filter(
            EscrowEvent.tx_hash == tx_hash,
            EscrowEvent.log_index == log_index
        ).first()
        
        if existing_event:
            logger.debug(f"Event already processed: {tx_hash}:{log_index}")
            return
        
        # Process different event types
        if event_name == "EscrowCreated":
            self._handle_escrow_created(db, event_args, tx_hash, block_number, block_hash, log_index)
        elif event_name == "Funded":
            self._handle_funded(db, event_args, tx_hash, block_number, block_hash, log_index)
        elif event_name == "DeliveryConfirmed":
            self._handle_delivery_confirmed(db, event_args, tx_hash, block_number, block_hash, log_index)
        elif event_name == "Released":
            self._handle_released(db, event_args, tx_hash, block_number, block_hash, log_index)
        elif event_name == "Disputed":
            self._handle_disputed(db, event_args, tx_hash, block_number, block_hash, log_index)
        elif event_name == "Resolved":
            self._handle_resolved(db, event_args, tx_hash, block_number, block_hash, log_index)
        elif event_name == "TimeoutRefund":
            self._handle_timeout_refund(db, event_args, tx_hash, block_number, block_hash, log_index)
        else:
            logger.warning(f"Unknown event type: {event_name}")

    def _find_escrow_by_trade_id(self, db: Session, trade_id: int) -> Escrow:
        """Find escrow by onchain trade ID"""
        return db.query(Escrow).filter(Escrow.onchain_trade_id == trade_id).first()

    def _create_event_record(
        self, 
        db: Session, 
        escrow_id: int, 
        event_type: EscrowEventType,
        payload: Dict[str, Any],
        tx_hash: str,
        block_number: int,
        block_hash: str,
        log_index: int
    ):
        """Create an event record in database"""
        event = EscrowEvent(
            escrow_id=escrow_id,
            event_type=event_type,
            payload=payload,
            tx_hash=tx_hash,
            block_number=block_number,
            block_hash=block_hash,
            log_index=log_index,
            is_processed=True,
            processed_at=datetime.utcnow()
        )
        db.add(event)
        return event

    def _handle_escrow_created(self, db: Session, args: Dict, tx_hash: str, block_number: int, block_hash: str, log_index: int):
        """Handle EscrowCreated event"""
        trade_id = args['tradeId']
        buyer_address = args['buyer']
        seller_address = args['seller']
        amount = args['amount']
        metadata = args.get('metadata', '{}')
        
        logger.info(f"Processing EscrowCreated event: trade_id={trade_id}, amount={amount}")
        
        # Try to find existing escrow by metadata or create new one
        escrow = None
        try:
            import json
            metadata_dict = json.loads(metadata) if metadata else {}
            escrow_id = metadata_dict.get('escrow_id')
            
            if escrow_id:
                escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
        except:
            pass
        
        if escrow:
            # Update existing escrow with onchain data
            escrow.onchain_trade_id = trade_id
            escrow.onchain_tx_hash = tx_hash
        else:
            logger.warning(f"Could not find escrow for trade_id {trade_id}")
            return
        
        # Create event record
        self._create_event_record(
            db, escrow.id, EscrowEventType.CREATED,
            {
                "trade_id": trade_id,
                "buyer_address": buyer_address,
                "seller_address": seller_address,
                "amount": amount,
                "metadata": metadata
            },
            tx_hash, block_number, block_hash, log_index
        )

    def _handle_funded(self, db: Session, args: Dict, tx_hash: str, block_number: int, block_hash: str, log_index: int):
        """Handle Funded event"""
        trade_id = args['tradeId']
        payer = args['payer']
        amount = args['amount']
        
        logger.info(f"Processing Funded event: trade_id={trade_id}, amount={amount}")
        
        escrow = self._find_escrow_by_trade_id(db, trade_id)
        if not escrow:
            logger.warning(f"Escrow not found for trade_id {trade_id}")
            return
        
        # Update escrow state
        if escrow.state == EscrowState.AWAITING_FUND:
            escrow.state = EscrowState.FUNDED
            escrow.funded_at = datetime.utcnow()
            escrow.onchain_tx_hash = tx_hash
            escrow.is_confirmed = True
            escrow.confirmations = 3  # Assume confirmed since we're processing it
        
        # Create event record
        self._create_event_record(
            db, escrow.id, EscrowEventType.FUNDED,
            {
                "trade_id": trade_id,
                "payer": payer,
                "amount": amount
            },
            tx_hash, block_number, block_hash, log_index
        )

    def _handle_delivery_confirmed(self, db: Session, args: Dict, tx_hash: str, block_number: int, block_hash: str, log_index: int):
        """Handle DeliveryConfirmed event"""
        trade_id = args['tradeId']
        confirmer = args.get('confirmer', '')
        
        logger.info(f"Processing DeliveryConfirmed event: trade_id={trade_id}")
        
        escrow = self._find_escrow_by_trade_id(db, trade_id)
        if not escrow:
            logger.warning(f"Escrow not found for trade_id {trade_id}")
            return
        
        # Update escrow state
        if escrow.state in [EscrowState.FUNDED, EscrowState.AWAITING_DELIVERY]:
            escrow.state = EscrowState.COMPLETE
            escrow.completed_at = datetime.utcnow()
        
        # Create event record
        self._create_event_record(
            db, escrow.id, EscrowEventType.DELIVERY_CONFIRMED,
            {
                "trade_id": trade_id,
                "confirmer": confirmer
            },
            tx_hash, block_number, block_hash, log_index
        )

    def _handle_released(self, db: Session, args: Dict, tx_hash: str, block_number: int, block_hash: str, log_index: int):
        """Handle Released event"""
        trade_id = args['tradeId']
        to_address = args['to']
        amount = args['amount']
        fee = args.get('fee', 0)
        
        logger.info(f"Processing Released event: trade_id={trade_id}, amount={amount}")
        
        escrow = self._find_escrow_by_trade_id(db, trade_id)
        if not escrow:
            logger.warning(f"Escrow not found for trade_id {trade_id}")
            return
        
        # Create event record
        self._create_event_record(
            db, escrow.id, EscrowEventType.RELEASED,
            {
                "trade_id": trade_id,
                "to_address": to_address,
                "amount": amount,
                "fee": fee
            },
            tx_hash, block_number, block_hash, log_index
        )

    def _handle_disputed(self, db: Session, args: Dict, tx_hash: str, block_number: int, block_hash: str, log_index: int):
        """Handle Disputed event"""
        trade_id = args['tradeId']
        by_address = args['by']
        reason = args.get('reason', '')
        
        logger.info(f"Processing Disputed event: trade_id={trade_id}")
        
        escrow = self._find_escrow_by_trade_id(db, trade_id)
        if not escrow:
            logger.warning(f"Escrow not found for trade_id {trade_id}")
            return
        
        # Update escrow state
        if escrow.state == EscrowState.FUNDED:
            escrow.state = EscrowState.DISPUTED
            escrow.disputed_at = datetime.utcnow()
            if reason and not escrow.dispute_reason:
                escrow.dispute_reason = reason
        
        # Create event record
        self._create_event_record(
            db, escrow.id, EscrowEventType.DISPUTED,
            {
                "trade_id": trade_id,
                "by_address": by_address,
                "reason": reason
            },
            tx_hash, block_number, block_hash, log_index
        )

    def _handle_resolved(self, db: Session, args: Dict, tx_hash: str, block_number: int, block_hash: str, log_index: int):
        """Handle Resolved event"""
        trade_id = args['tradeId']
        to_address = args['to']
        amount = args['amount']
        resolution = args.get('resolution', '')
        
        logger.info(f"Processing Resolved event: trade_id={trade_id}, amount={amount}")
        
        escrow = self._find_escrow_by_trade_id(db, trade_id)
        if not escrow:
            logger.warning(f"Escrow not found for trade_id {trade_id}")
            return
        
        # Update escrow state
        if escrow.state == EscrowState.DISPUTED:
            escrow.state = EscrowState.COMPLETE
            escrow.completed_at = datetime.utcnow()
            if resolution and not escrow.resolution_notes:
                escrow.resolution_notes = resolution
        
        # Create event record
        self._create_event_record(
            db, escrow.id, EscrowEventType.RESOLVED,
            {
                "trade_id": trade_id,
                "to_address": to_address,
                "amount": amount,
                "resolution": resolution
            },
            tx_hash, block_number, block_hash, log_index
        )

    def _handle_timeout_refund(self, db: Session, args: Dict, tx_hash: str, block_number: int, block_hash: str, log_index: int):
        """Handle TimeoutRefund event"""
        trade_id = args['tradeId']
        buyer_address = args['buyer']
        amount = args['amount']
        
        logger.info(f"Processing TimeoutRefund event: trade_id={trade_id}, amount={amount}")
        
        escrow = self._find_escrow_by_trade_id(db, trade_id)
        if not escrow:
            logger.warning(f"Escrow not found for trade_id {trade_id}")
            return
        
        # Update escrow state
        if escrow.state == EscrowState.FUNDED:
            escrow.state = EscrowState.COMPLETE
            escrow.completed_at = datetime.utcnow()
        
        # Create event record
        self._create_event_record(
            db, escrow.id, EscrowEventType.TIMEOUT_REFUND,
            {
                "trade_id": trade_id,
                "buyer_address": buyer_address,
                "amount": amount
            },
            tx_hash, block_number, block_hash, log_index
        )


def main():
    """Main entry point for the event processor"""
    try:
        processor = EventProcessor()
        processor.process_events()
    except KeyboardInterrupt:
        logger.info("Event processor stopped by user")
    except Exception as e:
        logger.error(f"Event processor crashed: {e}")
        raise


if __name__ == "__main__":
    main()
