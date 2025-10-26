#!/usr/bin/env python3
"""
Seed script for the oilseed hedging platform.
Creates sample users, listings, contracts, and price history data.
"""

import os
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from sqlalchemy.orm import Session

from app.core.db import SessionLocal, engine
from app.models import (
    AuditLog,
    Contract,
    ContractStatus,
    Listing,
    ListingStatus,
    Notification,
    PriceHistory,
    User,
)
import hashlib


def create_seed_data():
    """Create seed data for development and testing."""
    
    # Create database session
    db: Session = SessionLocal()
    
    try:
        print("🌱 Starting seed data creation...")
        
        # Create users (6 farmers, 4 buyers)
        users_data = [
            # Farmers
            {"name": "Rajesh Kumar", "email": "rajesh@farmer.com", "role": "farmer"},
            {"name": "Priya Singh", "email": "priya@farmer.com", "role": "farmer"},
            {"name": "Amit Patel", "email": "amit@farmer.com", "role": "farmer"},
            {"name": "Sunita Devi", "email": "sunita@farmer.com", "role": "farmer"},
            {"name": "Ravi Sharma", "email": "ravi@farmer.com", "role": "farmer"},
            {"name": "Meera Joshi", "email": "meera@farmer.com", "role": "farmer"},
            # Buyers
            {"name": "Agrotech Corp", "email": "buyer@agrotech.com", "role": "buyer"},
            {"name": "FoodCorp Ltd", "email": "procurement@foodcorp.com", "role": "buyer"},
            {"name": "Oil Mills Inc", "email": "sourcing@oilmills.com", "role": "buyer"},
            {"name": "Export House", "email": "trade@exporthouse.com", "role": "buyer"},
        ]
        
        users = []
        for user_data in users_data:
            # Simple hash for seed data - in production, use proper bcrypt
            password_hash = hashlib.sha256("password123".encode()).hexdigest()
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                password_hash=password_hash,
                role=user_data["role"],
                kyc_status="approved" if user_data["role"] == "buyer" else "pending",
            )
            db.add(user)
            users.append(user)
        
        db.commit()
        print(f"✅ Created {len(users)} users")
        
        # Create sample listings
        commodities = ["soymeal", "groundnut", "mustard", "sunflower"]
        listings_data = [
            {"commodity": "soymeal", "variety": "Premium", "qty_kg": 5000, "price_per_kg": 45.50, "moisture_pct": 12.5, "location": "Punjab", "seller_idx": 0},
            {"commodity": "groundnut", "variety": "Bold", "qty_kg": 3000, "price_per_kg": 85.00, "moisture_pct": 8.0, "location": "Gujarat", "seller_idx": 1},
            {"commodity": "mustard", "variety": "Varuna", "qty_kg": 2500, "price_per_kg": 55.75, "moisture_pct": 7.5, "location": "Rajasthan", "seller_idx": 2},
            {"commodity": "sunflower", "variety": "Hybrid", "qty_kg": 4000, "price_per_kg": 42.25, "moisture_pct": 9.0, "location": "Karnataka", "seller_idx": 3},
            {"commodity": "soymeal", "variety": "Standard", "qty_kg": 6000, "price_per_kg": 43.00, "moisture_pct": 13.0, "location": "Madhya Pradesh", "seller_idx": 4},
            {"commodity": "groundnut", "variety": "Java", "qty_kg": 2000, "price_per_kg": 90.00, "moisture_pct": 7.0, "location": "Tamil Nadu", "seller_idx": 5},
            {"commodity": "mustard", "variety": "Pusa Bold", "qty_kg": 3500, "price_per_kg": 58.50, "moisture_pct": 8.5, "location": "Haryana", "seller_idx": 0},
            {"commodity": "sunflower", "variety": "DRSH-1", "qty_kg": 1800, "price_per_kg": 44.75, "moisture_pct": 8.0, "location": "Andhra Pradesh", "seller_idx": 1},
        ]
        
        farmers = [u for u in users if u.role == "farmer"]
        listings = []
        
        for listing_data in listings_data:
            listing = Listing(
                seller_id=farmers[listing_data["seller_idx"]].id,
                commodity=listing_data["commodity"],
                variety=listing_data["variety"],
                qty_kg=listing_data["qty_kg"],
                price_per_kg=listing_data["price_per_kg"],
                moisture_pct=listing_data["moisture_pct"],
                quality_notes=f"High quality {listing_data['commodity']} from {listing_data['location']}",
                location=listing_data["location"],
                status=ListingStatus.active,
                photos=[],
            )
            db.add(listing)
            listings.append(listing)
        
        db.commit()
        print(f"✅ Created {len(listings)} listings")
        
        # Create sample contracts (offers)
        buyers = [u for u in users if u.role == "buyer"]
        contracts_data = [
            {"listing_idx": 0, "buyer_idx": 0, "qty_kg": 2000, "offer_price": 46.00, "status": "OFFERED"},
            {"listing_idx": 1, "buyer_idx": 1, "qty_kg": 1500, "offer_price": 87.50, "status": "ACCEPTED"},
            {"listing_idx": 2, "buyer_idx": 2, "qty_kg": 2500, "offer_price": 56.00, "status": "COMPLETED"},
        ]
        
        contracts = []
        for contract_data in contracts_data:
            listing = listings[contract_data["listing_idx"]]
            buyer = buyers[contract_data["buyer_idx"]]
            
            contract = Contract(
                listing_id=listing.id,
                buyer_id=buyer.id,
                seller_id=listing.seller_id,
                qty_kg=contract_data["qty_kg"],
                offer_price_per_kg=Decimal(str(contract_data["offer_price"])),
                status=contract_data["status"],
                expiry_date=datetime.utcnow() + timedelta(days=30),
            )
            db.add(contract)
            contracts.append(contract)
        
        db.commit()
        print(f"✅ Created {len(contracts)} contracts")
        
        # Create price history for charts
        base_date = date.today() - timedelta(days=30)
        price_history_data = []
        
        base_prices = {
            "soymeal": 44.0,
            "groundnut": 82.0,
            "mustard": 54.0,
            "sunflower": 41.0,
        }
        
        for i in range(31):  # Last 30 days + today
            current_date = base_date + timedelta(days=i)
            for commodity, base_price in base_prices.items():
                # Add some realistic price variation
                variation = (i % 7 - 3) * 0.5  # ±1.5 price variation
                price = base_price + variation + (i * 0.1)  # Slight upward trend
                
                price_record = PriceHistory(
                    commodity=commodity,
                    price_per_kg=round(price, 2),
                    recorded_on=current_date,
                )
                db.add(price_record)
                price_history_data.append(price_record)
        
        db.commit()
        print(f"✅ Created {len(price_history_data)} price history records")
        
        # Create sample notifications
        notifications_data = [
            {"user_id": farmers[0].id, "type": "offer-created", "payload": {"contract_id": contracts[0].id, "listing_id": listings[0].id}},
            {"user_id": buyers[1].id, "type": "offer-accepted", "payload": {"contract_id": contracts[1].id}},
            {"user_id": buyers[2].id, "type": "contract-completed", "payload": {"contract_id": contracts[2].id}},
        ]
        
        notifications = []
        for notif_data in notifications_data:
            notification = Notification(
                user_id=notif_data["user_id"],
                type=notif_data["type"],
                payload=notif_data["payload"],
                read=False,
            )
            db.add(notification)
            notifications.append(notification)
        
        db.commit()
        print(f"✅ Created {len(notifications)} notifications")
        
        # Create audit logs for contracts
        audit_logs = []
        for i, contract in enumerate(contracts):
            # Create audit log for contract creation
            audit_log = AuditLog(
                entity_type="contract",
                entity_id=contract.id,
                action="offer_created",
                actor_id=contract.buyer_id,
                payload={"status": contract.status, "qty_kg": contract.qty_kg},
            )
            db.add(audit_log)
            audit_logs.append(audit_log)
            
            # Add additional logs for accepted/completed contracts
            if contract.status in ["ACCEPTED", "COMPLETED"]:
                accept_log = AuditLog(
                    entity_type="contract",
                    entity_id=contract.id,
                    action="offer_accepted",
                    actor_id=contract.seller_id,
                    payload={"status": "ACCEPTED"},
                )
                db.add(accept_log)
                audit_logs.append(accept_log)
            
            if contract.status == "COMPLETED":
                complete_log = AuditLog(
                    entity_type="contract",
                    entity_id=contract.id,
                    action="delivery_confirmed",
                    actor_id=contract.seller_id,
                    payload={"status": "COMPLETED"},
                )
                db.add(complete_log)
                audit_logs.append(complete_log)
        
        db.commit()
        print(f"✅ Created {len(audit_logs)} audit log entries")
        
        print("\n🎉 Seed data creation completed successfully!")
        print("\nSample login credentials:")
        print("Farmer: rajesh@farmer.com / password123")
        print("Buyer: buyer@agrotech.com / password123")
        print("\nAll users use password: password123")
        
    except Exception as e:
        print(f"❌ Error creating seed data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Ensure tables exist
    from app.models import Base
    Base.metadata.create_all(bind=engine)
    
    create_seed_data()
