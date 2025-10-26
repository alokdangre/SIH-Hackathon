import os
import json
import logging
from typing import Optional, Dict, Any, Tuple
from web3 import Web3
from web3.contract import Contract
from web3.exceptions import TransactionNotFound, BlockNotFound
from eth_account import Account
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class Web3Service:
    """Service for interacting with Ethereum/Polygon blockchain"""
    
    def __init__(self):
        self.rpc_url = os.getenv("MUMBAI_RPC_URL")
        self.contract_address = os.getenv("ESCROW_CONTRACT_ADDRESS")
        self.admin_private_key = os.getenv("ESCROW_ADMIN_PRIVATE_KEY")
        self.admin_address = os.getenv("ESCROW_ADMIN_ADDRESS")
        self.confirmations_required = int(os.getenv("WEB3_CONFIRMATIONS", "3"))
        
        if not self.rpc_url:
            logger.warning("MUMBAI_RPC_URL not set - Web3 functionality will be disabled")
            self.w3 = None
            self.contract = None
            self.admin_account = None
            return
        
        # Initialize Web3
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to Web3 provider: {self.rpc_url}")
        
        # Load contract ABI and initialize contract
        self.contract = None
        if self.contract_address:
            self._load_contract()
        
        # Initialize admin account if private key provided
        self.admin_account = None
        if self.admin_private_key:
            self.admin_account = Account.from_key(self.admin_private_key)
            if self.admin_address and self.admin_account.address.lower() != self.admin_address.lower():
                logger.warning("Admin address mismatch with private key")

    def _load_contract(self):
        """Load the escrow contract ABI and initialize contract instance"""
        try:
            # Try to load ABI from deployments directory
            abi_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "contracts", "deployments", "HedgeEscrow.abi.json")
            
            if os.path.exists(abi_path):
                with open(abi_path, 'r') as f:
                    contract_abi = json.load(f)
            else:
                # Fallback to minimal ABI if file not found
                contract_abi = self._get_minimal_abi()
            
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(self.contract_address),
                abi=contract_abi
            )
            logger.info(f"Loaded escrow contract at {self.contract_address}")
            
        except Exception as e:
            logger.error(f"Failed to load contract: {e}")
            raise

    def _get_minimal_abi(self):
        """Minimal ABI for basic contract interaction"""
        return [
            {
                "inputs": [{"name": "_seller", "type": "address"}, {"name": "_metadata", "type": "string"}],
                "name": "createAndFundTrade",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [{"name": "tradeId", "type": "uint256"}],
                "name": "confirmDelivery",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"name": "tradeId", "type": "uint256"}, {"name": "reason", "type": "string"}],
                "name": "raiseDispute",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "tradeId", "type": "uint256"},
                    {"name": "to", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                    {"name": "resolution", "type": "string"}
                ],
                "name": "resolveDispute",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"name": "tradeId", "type": "uint256"}],
                "name": "getTrade",
                "outputs": [
                    {"name": "buyer", "type": "address"},
                    {"name": "seller", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                    {"name": "state", "type": "uint8"},
                    {"name": "createdAt", "type": "uint256"},
                    {"name": "timeoutAt", "type": "uint256"},
                    {"name": "metadata", "type": "string"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]

    def verify_funding_tx(self, tx_hash: str, expected_amount_wei: int, expected_to: str = None) -> Tuple[bool, Any]:
        """
        Verify a funding transaction
        
        Args:
            tx_hash: Transaction hash to verify
            expected_amount_wei: Expected amount in wei
            expected_to: Expected recipient address (contract address)
            
        Returns:
            Tuple of (is_valid, receipt_or_error_message)
        """
        try:
            # Get transaction receipt
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            if not receipt:
                return False, "Transaction receipt not found"
            
            # Check if transaction was successful
            if receipt.status != 1:
                return False, "Transaction failed"
            
            # Check confirmations
            current_block = self.w3.eth.block_number
            confirmations = current_block - receipt.blockNumber
            
            if confirmations < self.confirmations_required:
                return False, f"Insufficient confirmations: {confirmations}/{self.confirmations_required}"
            
            # Get transaction details
            tx = self.w3.eth.get_transaction(tx_hash)
            
            # Verify recipient address if provided
            if expected_to:
                expected_to = Web3.to_checksum_address(expected_to)
                if tx['to'] and Web3.to_checksum_address(tx['to']) != expected_to:
                    return False, f"Transaction recipient mismatch: {tx['to']} != {expected_to}"
            
            # Verify amount
            if tx['value'] != expected_amount_wei:
                return False, f"Amount mismatch: {tx['value']} != {expected_amount_wei}"
            
            return True, receipt
            
        except TransactionNotFound:
            return False, "Transaction not found"
        except Exception as e:
            logger.error(f"Error verifying transaction {tx_hash}: {e}")
            return False, str(e)

    def get_transaction_details(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """Get detailed transaction information"""
        try:
            tx = self.w3.eth.get_transaction(tx_hash)
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            
            current_block = self.w3.eth.block_number
            confirmations = current_block - receipt.blockNumber if receipt else 0
            
            return {
                "hash": tx_hash,
                "from": tx["from"],
                "to": tx["to"],
                "value": tx["value"],
                "gas": tx["gas"],
                "gasPrice": tx["gasPrice"],
                "blockNumber": receipt.blockNumber if receipt else None,
                "blockHash": receipt.blockHash.hex() if receipt and receipt.blockHash else None,
                "status": receipt.status if receipt else None,
                "confirmations": confirmations,
                "isConfirmed": confirmations >= self.confirmations_required
            }
            
        except Exception as e:
            logger.error(f"Error getting transaction details for {tx_hash}: {e}")
            return None

    def create_and_fund_trade_custodial(self, seller_address: str, amount_wei: int, metadata: str) -> Tuple[bool, Any]:
        """
        Create and fund trade using custodial admin account
        
        Args:
            seller_address: Address of the seller
            amount_wei: Amount to fund in wei
            metadata: Trade metadata JSON string
            
        Returns:
            Tuple of (success, transaction_hash_or_error)
        """
        if not self.admin_account or not self.contract:
            return False, "Admin account or contract not configured"
        
        try:
            # Build transaction
            function = self.contract.functions.createAndFundTrade(
                Web3.to_checksum_address(seller_address),
                metadata
            )
            
            # Estimate gas
            gas_estimate = function.estimate_gas({
                'from': self.admin_account.address,
                'value': amount_wei
            })
            
            # Get current gas price
            gas_price = self.w3.eth.gas_price
            
            # Build transaction
            transaction = function.build_transaction({
                'from': self.admin_account.address,
                'value': amount_wei,
                'gas': int(gas_estimate * 1.2),  # Add 20% buffer
                'gasPrice': gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.admin_account.address)
            })
            
            # Sign and send transaction
            signed_txn = self.admin_account.sign_transaction(transaction)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return True, tx_hash.hex()
            
        except Exception as e:
            logger.error(f"Error creating custodial trade: {e}")
            return False, str(e)

    def confirm_delivery_custodial(self, trade_id: int) -> Tuple[bool, Any]:
        """Confirm delivery using custodial admin account"""
        if not self.admin_account or not self.contract:
            return False, "Admin account or contract not configured"
        
        try:
            function = self.contract.functions.confirmDelivery(trade_id)
            
            gas_estimate = function.estimate_gas({'from': self.admin_account.address})
            gas_price = self.w3.eth.gas_price
            
            transaction = function.build_transaction({
                'from': self.admin_account.address,
                'gas': int(gas_estimate * 1.2),
                'gasPrice': gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.admin_account.address)
            })
            
            signed_txn = self.admin_account.sign_transaction(transaction)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return True, tx_hash.hex()
            
        except Exception as e:
            logger.error(f"Error confirming delivery for trade {trade_id}: {e}")
            return False, str(e)

    def resolve_dispute_custodial(self, trade_id: int, recipient_address: str, amount_wei: int, resolution: str) -> Tuple[bool, Any]:
        """Resolve dispute using custodial admin account"""
        if not self.admin_account or not self.contract:
            return False, "Admin account or contract not configured"
        
        try:
            function = self.contract.functions.resolveDispute(
                trade_id,
                Web3.to_checksum_address(recipient_address),
                amount_wei,
                resolution
            )
            
            gas_estimate = function.estimate_gas({'from': self.admin_account.address})
            gas_price = self.w3.eth.gas_price
            
            transaction = function.build_transaction({
                'from': self.admin_account.address,
                'gas': int(gas_estimate * 1.2),
                'gasPrice': gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.admin_account.address)
            })
            
            signed_txn = self.admin_account.sign_transaction(transaction)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return True, tx_hash.hex()
            
        except Exception as e:
            logger.error(f"Error resolving dispute for trade {trade_id}: {e}")
            return False, str(e)

    def get_trade_details(self, trade_id: int) -> Optional[Dict[str, Any]]:
        """Get trade details from smart contract"""
        if not self.contract:
            return None
        
        try:
            result = self.contract.functions.getTrade(trade_id).call()
            
            return {
                "buyer": result[0],
                "seller": result[1],
                "amount": result[2],
                "state": result[3],
                "createdAt": result[4],
                "timeoutAt": result[5],
                "metadata": result[6]
            }
            
        except Exception as e:
            logger.error(f"Error getting trade details for {trade_id}: {e}")
            return None

    def get_contract_events(self, from_block: int, to_block: int = 'latest') -> list:
        """Get contract events within block range"""
        if not self.contract:
            return []
        
        try:
            # Get all events from the contract
            events = []
            
            # Define event filters
            event_filters = [
                'EscrowCreated',
                'Funded', 
                'DeliveryConfirmed',
                'Released',
                'Disputed',
                'Resolved',
                'TimeoutRefund'
            ]
            
            for event_name in event_filters:
                try:
                    event_filter = getattr(self.contract.events, event_name).create_filter(
                        fromBlock=from_block,
                        toBlock=to_block
                    )
                    
                    event_logs = event_filter.get_all_entries()
                    
                    for log in event_logs:
                        events.append({
                            'event': event_name,
                            'args': dict(log.args),
                            'transactionHash': log.transactionHash.hex(),
                            'blockNumber': log.blockNumber,
                            'blockHash': log.blockHash.hex(),
                            'logIndex': log.logIndex,
                            'address': log.address
                        })
                        
                except Exception as e:
                    logger.warning(f"Error getting {event_name} events: {e}")
                    continue
            
            # Sort by block number and log index
            events.sort(key=lambda x: (x['blockNumber'], x['logIndex']))
            
            return events
            
        except Exception as e:
            logger.error(f"Error getting contract events: {e}")
            return []

    def wei_to_eth(self, wei_amount: int) -> float:
        """Convert wei to ETH"""
        return wei_amount / 10**18

    def eth_to_wei(self, eth_amount: float) -> int:
        """Convert ETH to wei"""
        return int(eth_amount * 10**18)

    def is_valid_address(self, address: str) -> bool:
        """Check if address is valid Ethereum address"""
        try:
            Web3.to_checksum_address(address)
            return True
        except:
            return False

    def get_balance(self, address: str) -> Optional[int]:
        """Get ETH balance for address in wei"""
        try:
            return self.w3.eth.get_balance(Web3.to_checksum_address(address))
        except Exception as e:
            logger.error(f"Error getting balance for {address}: {e}")
            return None

    def get_current_block(self) -> int:
        """Get current block number"""
        return self.w3.eth.block_number


# Global instance
web3_service = Web3Service()
