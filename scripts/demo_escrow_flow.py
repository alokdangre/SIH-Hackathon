#!/usr/bin/env python3
"""
Demo script for Phase 2 Escrow & Settlement system
Demonstrates complete escrow flow from creation to resolution
"""

import os
import sys
import time
import json
import requests
from datetime import datetime
from typing import Dict, Any

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.services.web3_service import web3_service

# Configuration
API_BASE_URL = "http://localhost:8000"
DEMO_USERS = {
    "farmer": {
        "email": "farmer@demo.com",
        "password": "demo123",
        "name": "Demo Farmer",
        "role": "farmer"
    },
    "buyer": {
        "email": "buyer@demo.com", 
        "password": "demo123",
        "name": "Demo Buyer",
        "role": "buyer"
    },
    "admin": {
        "email": "admin@demo.com",
        "password": "admin123",
        "name": "Demo Admin",
        "role": "admin"
    }
}

class EscrowDemo:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.demo_data = {}
        
    def log(self, message: str, level: str = "INFO"):
        """Log demo progress"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def api_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> Dict[str, Any]:
        """Make API request with error handling"""
        url = f"{API_BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, params=data)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            self.log(f"API request failed: {e}", "ERROR")
            if hasattr(e.response, 'text'):
                self.log(f"Response: {e.response.text}", "ERROR")
            raise
            
    def setup_demo_users(self):
        """Create or login demo users"""
        self.log("Setting up demo users...")
        
        for role, user_data in DEMO_USERS.items():
            try:
                # Try to login first
                login_response = self.api_request("POST", "/auth/login", {
                    "email": user_data["email"],
                    "password": user_data["password"]
                })
                self.tokens[role] = login_response["access_token"]
                self.log(f"Logged in as {role}: {user_data['email']}")
                
            except requests.exceptions.HTTPError:
                # User doesn't exist, create them
                try:
                    signup_response = self.api_request("POST", "/auth/signup", user_data)
                    self.log(f"Created {role} user: {user_data['email']}")
                    
                    # Now login
                    login_response = self.api_request("POST", "/auth/login", {
                        "email": user_data["email"],
                        "password": user_data["password"]
                    })
                    self.tokens[role] = login_response["access_token"]
                    
                except Exception as e:
                    self.log(f"Failed to create {role} user: {e}", "ERROR")
                    raise
                    
    def create_demo_listing(self):
        """Create a demo listing"""
        self.log("Creating demo listing...")
        
        listing_data = {
            "commodity": "soymeal",
            "variety": "premium",
            "qty_kg": 1000,
            "price_per_kg": 45.50,
            "location": "Punjab, India",
            "quality_notes": "High quality soymeal, moisture content 12%",
            "photos": []
        }
        
        # Create as farmer
        listing = self.api_request("POST", "/listings/", listing_data, self.tokens["farmer"])
        self.demo_data["listing"] = listing
        self.log(f"Created listing #{listing['id']}: {listing['commodity']}")
        
    def create_demo_contract(self):
        """Create a demo contract/offer"""
        self.log("Creating demo contract...")
        
        contract_data = {
            "listing_id": self.demo_data["listing"]["id"],
            "qty": 500,  # Half the available quantity
            "offer_price_per_kg": 44.00,  # Slightly lower than listing price
            "expiry_date": "2024-12-31"
        }
        
        # Create as buyer
        contract = self.api_request("POST", "/contracts/", contract_data, self.tokens["buyer"])
        self.demo_data["contract"] = contract
        self.log(f"Created contract #{contract['id']}: {contract['qty_kg']} kg at ₹{contract['offer_price_per_kg']}/kg")
        
        # Accept as farmer
        accept_data = {"accepter_id": self.demo_data["listing"]["seller_id"]}
        accepted_contract = self.api_request("POST", f"/contracts/{contract['id']}/accept", accept_data, self.tokens["farmer"])
        self.demo_data["contract"] = accepted_contract
        self.log(f"Contract #{contract['id']} accepted by farmer")
        
    def demo_scenario_1_successful_trade(self):
        """Demo Scenario 1: Successful trade with escrow"""
        self.log("\n" + "="*60)
        self.log("DEMO SCENARIO 1: Successful Trade")
        self.log("="*60)
        
        # Step 1: Create escrow
        self.log("Step 1: Creating escrow...")
        contract = self.demo_data["contract"]
        
        escrow_data = {
            "contract_id": contract["id"],
            "buyer_id": contract["buyer_id"],
            "seller_id": contract["seller_id"],
            "expected_amount_wei": int(0.1 * 10**18),  # 0.1 MATIC for demo
            "create_on_chain": False,
            "metadata": {
                "commodity": contract["listing_ref"],
                "quantity_kg": contract["qty_kg"],
                "price_per_kg": contract["offer_price_per_kg"]
            }
        }
        
        escrow = self.api_request("POST", "/escrow/create", escrow_data, self.tokens["buyer"])
        self.demo_data["escrow"] = escrow
        self.log(f"Created escrow #{escrow['escrow_id']}")
        
        # Step 2: Fund escrow (custodial for demo)
        self.log("Step 2: Funding escrow...")
        fund_data = {
            "escrow_id": escrow["escrow_id"],
            "use_custodial": True
        }
        
        fund_result = self.api_request("POST", "/escrow/fund", fund_data, self.tokens["buyer"])
        self.log(f"Escrow funded: {fund_result['status']}")
        if fund_result.get("tx_receipt"):
            self.log(f"Transaction hash: {fund_result['tx_receipt'].get('transactionHash', 'N/A')}")
            
        # Step 3: Check escrow status
        self.log("Step 3: Checking escrow status...")
        status = self.api_request("GET", f"/escrow/{escrow['escrow_id']}/status", token=self.tokens["buyer"])
        self.log(f"Escrow state: {status['escrow']['state']}")
        self.log(f"Amount: {status['escrow']['amount_eth']:.4f} MATIC")
        
        # Step 4: Confirm delivery
        self.log("Step 4: Confirming delivery...")
        delivery_data = {
            "escrow_id": escrow["escrow_id"],
            "use_custodial": True
        }
        
        delivery_result = self.api_request("POST", f"/escrow/{escrow['escrow_id']}/confirm-delivery", delivery_data, self.tokens["farmer"])
        self.log(f"Delivery confirmed: {delivery_result['status']}")
        
        # Step 5: Final status check
        self.log("Step 5: Final status check...")
        final_status = self.api_request("GET", f"/escrow/{escrow['escrow_id']}/status", token=self.tokens["buyer"])
        self.log(f"Final escrow state: {final_status['escrow']['state']}")
        
        self.log("✅ Scenario 1 completed successfully!")
        
    def demo_scenario_2_disputed_trade(self):
        """Demo Scenario 2: Disputed trade with admin resolution"""
        self.log("\n" + "="*60)
        self.log("DEMO SCENARIO 2: Disputed Trade")
        self.log("="*60)
        
        # Create another contract for this scenario
        self.log("Setting up new contract for dispute scenario...")
        
        contract_data = {
            "listing_id": self.demo_data["listing"]["id"],
            "qty": 300,
            "offer_price_per_kg": 43.00,
            "expiry_date": "2024-12-31"
        }
        
        contract = self.api_request("POST", "/contracts/", contract_data, self.tokens["buyer"])
        
        # Accept contract
        accept_data = {"accepter_id": self.demo_data["listing"]["seller_id"]}
        contract = self.api_request("POST", f"/contracts/{contract['id']}/accept", accept_data, self.tokens["farmer"])
        
        # Step 1: Create and fund escrow
        self.log("Step 1: Creating and funding escrow...")
        
        escrow_data = {
            "contract_id": contract["id"],
            "buyer_id": contract["buyer_id"],
            "seller_id": contract["seller_id"],
            "expected_amount_wei": int(0.08 * 10**18),  # 0.08 MATIC
            "create_on_chain": False,
            "metadata": {"scenario": "dispute_demo"}
        }
        
        escrow = self.api_request("POST", "/escrow/create", escrow_data, self.tokens["buyer"])
        
        fund_data = {
            "escrow_id": escrow["escrow_id"],
            "use_custodial": True
        }
        
        self.api_request("POST", "/escrow/fund", fund_data, self.tokens["buyer"])
        self.log(f"Escrow #{escrow['escrow_id']} created and funded")
        
        # Step 2: Raise dispute
        self.log("Step 2: Raising dispute...")
        
        dispute_data = {
            "escrow_id": escrow["escrow_id"],
            "reason": "Quality issues: Moisture content higher than specified (15% vs 12%)",
            "evidence_urls": []
        }
        
        dispute_result = self.api_request("POST", f"/escrow/{escrow['escrow_id']}/raise-dispute", dispute_data, self.tokens["buyer"])
        self.log(f"Dispute raised: {dispute_result['message']}")
        
        # Step 3: Admin views disputes
        self.log("Step 3: Admin reviewing disputes...")
        
        disputes = self.api_request("GET", "/escrow/admin/disputes", token=self.tokens["admin"])
        self.log(f"Found {disputes['total']} active disputes")
        
        # Step 4: Admin resolves dispute (partial refund)
        self.log("Step 4: Admin resolving dispute...")
        
        resolution_data = {
            "escrow_id": escrow["escrow_id"],
            "outcome": "partial",
            "payout_address": "0x" + "1" * 40,  # Dummy address for demo
            "payout_amount_wei": int(0.05 * 10**18),  # 0.05 MATIC to buyer
            "resolution_notes": "Partial refund approved due to quality issues. 0.05 MATIC to buyer, 0.03 MATIC to seller."
        }
        
        resolution_result = self.api_request("POST", f"/escrow/{escrow['escrow_id']}/resolve", resolution_data, self.tokens["admin"])
        self.log(f"Dispute resolved: {resolution_result['message']}")
        
        # Step 5: Final status
        final_status = self.api_request("GET", f"/escrow/{escrow['escrow_id']}/status", token=self.tokens["admin"])
        self.log(f"Final state: {final_status['escrow']['state']}")
        self.log(f"Resolution notes: {final_status['escrow']['resolution_notes']}")
        
        self.log("✅ Scenario 2 completed successfully!")
        
    def demo_blockchain_integration(self):
        """Demo blockchain integration capabilities"""
        self.log("\n" + "="*60)
        self.log("DEMO: Blockchain Integration")
        self.log("="*60)
        
        try:
            # Check Web3 connection
            current_block = web3_service.get_current_block()
            self.log(f"Connected to blockchain - Current block: {current_block}")
            
            # Check contract
            if web3_service.contract_address:
                self.log(f"Escrow contract address: {web3_service.contract_address}")
                
                # Get contract balance
                balance = web3_service.get_balance(web3_service.contract_address)
                if balance is not None:
                    self.log(f"Contract balance: {balance} MATIC")
                    
            # Check admin account
            if web3_service.admin_account:
                admin_balance = web3_service.get_balance(web3_service.admin_account.address)
                if admin_balance is not None:
                    self.log(f"Admin account balance: {admin_balance} MATIC")
                    
        except Exception as e:
            self.log(f"Blockchain integration not fully configured: {e}", "WARNING")
            self.log("This is expected in development environment", "INFO")
            
    def run_demo(self):
        """Run complete demo"""
        try:
            self.log("🚀 Starting Phase 2 Escrow & Settlement Demo")
            self.log("=" * 60)
            
            # Setup
            self.setup_demo_users()
            self.create_demo_listing()
            self.create_demo_contract()
            
            # Demo scenarios
            self.demo_scenario_1_successful_trade()
            time.sleep(2)  # Brief pause between scenarios
            
            self.demo_scenario_2_disputed_trade()
            time.sleep(2)
            
            self.demo_blockchain_integration()
            
            # Summary
            self.log("\n" + "="*60)
            self.log("🎉 DEMO COMPLETED SUCCESSFULLY!")
            self.log("="*60)
            self.log("Summary of what was demonstrated:")
            self.log("✅ User authentication and role management")
            self.log("✅ Listing and contract creation")
            self.log("✅ Escrow creation and funding")
            self.log("✅ Successful trade completion")
            self.log("✅ Dispute raising and resolution")
            self.log("✅ Admin dispute management")
            self.log("✅ Blockchain integration capabilities")
            self.log("\nNext steps:")
            self.log("1. Deploy smart contract to Mumbai testnet")
            self.log("2. Configure Web3 environment variables")
            self.log("3. Test with real MetaMask transactions")
            self.log("4. Set up event processor for production")
            
        except Exception as e:
            self.log(f"Demo failed: {e}", "ERROR")
            raise


def main():
    """Main entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("""
Phase 2 Escrow Demo Script

This script demonstrates the complete escrow functionality including:
- User management and authentication
- Listing and contract creation  
- Escrow creation, funding, and completion
- Dispute raising and admin resolution
- Blockchain integration testing

Prerequisites:
- Backend API server running on localhost:8000
- Database migrations applied
- (Optional) Smart contract deployed and configured

Usage:
    python scripts/demo_escrow_flow.py
    
Environment Variables (optional):
    MUMBAI_RPC_URL - Mumbai testnet RPC endpoint
    ESCROW_CONTRACT_ADDRESS - Deployed contract address
    ESCROW_ADMIN_PRIVATE_KEY - Admin private key for custodial transactions
        """)
        return
        
    demo = EscrowDemo()
    demo.run_demo()


if __name__ == "__main__":
    main()
