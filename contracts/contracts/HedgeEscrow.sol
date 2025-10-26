// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HedgeEscrow
 * @dev Escrow contract for oilseed hedging platform
 * Handles secure fund holding and release for agricultural commodity trades
 */
contract HedgeEscrow is ReentrancyGuard, Ownable {
    
    enum State { 
        AWAITING_FUND,      // Trade created, waiting for funding
        FUNDED,             // Funds deposited, awaiting delivery
        AWAITING_DELIVERY,  // Delivery in progress
        COMPLETE,           // Trade completed successfully
        DISPUTED            // Dispute raised, awaiting resolution
    }

    struct Trade {
        address buyer;
        address seller;
        uint256 amount;       // Amount in wei
        State state;
        uint256 createdAt;
        uint256 timeoutAt;    // Optional timeout for auto-refund
        string metadata;      // JSON metadata for trade details
    }

    mapping(uint256 => Trade) public trades;
    uint256 public nextTradeId;
    
    // Fee configuration (basis points, e.g., 100 = 1%)
    uint256 public platformFeeBps = 100; // 1% platform fee
    address public feeRecipient;
    
    // Timeout configuration
    uint256 public defaultTimeoutDuration = 30 days;

    // Events
    event EscrowCreated(
        uint256 indexed tradeId, 
        address indexed buyer, 
        address indexed seller, 
        uint256 amount,
        string metadata
    );
    
    event Funded(
        uint256 indexed tradeId, 
        address indexed payer, 
        uint256 amount
    );
    
    event DeliveryConfirmed(
        uint256 indexed tradeId,
        address indexed confirmer
    );
    
    event Released(
        uint256 indexed tradeId, 
        address indexed to, 
        uint256 amount,
        uint256 fee
    );
    
    event Disputed(
        uint256 indexed tradeId, 
        address indexed by,
        string reason
    );
    
    event Resolved(
        uint256 indexed tradeId, 
        address indexed to, 
        uint256 amount,
        string resolution
    );
    
    event TimeoutRefund(
        uint256 indexed tradeId,
        address indexed buyer,
        uint256 amount
    );

    modifier onlyTradeParties(uint256 tradeId) {
        Trade storage trade = trades[tradeId];
        require(
            msg.sender == trade.buyer || msg.sender == trade.seller,
            "Only trade parties allowed"
        );
        _;
    }

    modifier validTradeId(uint256 tradeId) {
        require(tradeId < nextTradeId, "Invalid trade ID");
        _;
    }

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Create and fund trade in one transaction
     * @param _seller Address of the seller
     * @param _metadata JSON metadata for the trade
     * @return tradeId The created trade ID
     */
    function createAndFundTrade(
        address _seller, 
        string calldata _metadata
    ) external payable nonReentrant returns (uint256) {
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller cannot be same");
        require(msg.value > 0, "Amount must be greater than 0");
        
        uint256 tradeId = nextTradeId++;
        uint256 timeoutAt = block.timestamp + defaultTimeoutDuration;
        
        trades[tradeId] = Trade({
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            state: State.FUNDED,
            createdAt: block.timestamp,
            timeoutAt: timeoutAt,
            metadata: _metadata
        });
        
        emit EscrowCreated(tradeId, msg.sender, _seller, msg.value, _metadata);
        emit Funded(tradeId, msg.sender, msg.value);
        
        return tradeId;
    }

    /**
     * @dev Create trade without funding (for separate funding step)
     * @param _seller Address of the seller
     * @param _metadata JSON metadata for the trade
     * @return tradeId The created trade ID
     */
    function createTradeWithoutFund(
        address _seller,
        string calldata _metadata
    ) external returns (uint256) {
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller cannot be same");
        
        uint256 tradeId = nextTradeId++;
        uint256 timeoutAt = block.timestamp + defaultTimeoutDuration;
        
        trades[tradeId] = Trade({
            buyer: msg.sender,
            seller: _seller,
            amount: 0,
            state: State.AWAITING_FUND,
            createdAt: block.timestamp,
            timeoutAt: timeoutAt,
            metadata: _metadata
        });
        
        emit EscrowCreated(tradeId, msg.sender, _seller, 0, _metadata);
        
        return tradeId;
    }

    /**
     * @dev Fund an existing trade
     * @param tradeId The trade ID to fund
     */
    function fundTrade(uint256 tradeId) 
        external 
        payable 
        nonReentrant 
        validTradeId(tradeId) 
    {
        Trade storage trade = trades[tradeId];
        require(msg.sender == trade.buyer, "Only buyer can fund");
        require(trade.state == State.AWAITING_FUND, "Trade not awaiting funding");
        require(msg.value > 0, "Amount must be greater than 0");
        
        trade.amount = msg.value;
        trade.state = State.FUNDED;
        
        emit Funded(tradeId, msg.sender, msg.value);
    }

    /**
     * @dev Confirm delivery (callable by seller or buyer)
     * @param tradeId The trade ID
     */
    function confirmDelivery(uint256 tradeId) 
        external 
        nonReentrant 
        validTradeId(tradeId)
        onlyTradeParties(tradeId)
    {
        Trade storage trade = trades[tradeId];
        require(trade.state == State.FUNDED, "Trade not funded");
        
        trade.state = State.COMPLETE;
        
        // Calculate platform fee
        uint256 fee = (trade.amount * platformFeeBps) / 10000;
        uint256 sellerAmount = trade.amount - fee;
        
        // Transfer to seller
        (bool sellerSent, ) = payable(trade.seller).call{value: sellerAmount}("");
        require(sellerSent, "Transfer to seller failed");
        
        // Transfer fee to platform
        if (fee > 0) {
            (bool feeSent, ) = payable(feeRecipient).call{value: fee}("");
            require(feeSent, "Fee transfer failed");
        }
        
        emit DeliveryConfirmed(tradeId, msg.sender);
        emit Released(tradeId, trade.seller, sellerAmount, fee);
    }

    /**
     * @dev Raise a dispute
     * @param tradeId The trade ID
     * @param reason Reason for the dispute
     */
    function raiseDispute(uint256 tradeId, string calldata reason) 
        external 
        validTradeId(tradeId)
        onlyTradeParties(tradeId)
    {
        Trade storage trade = trades[tradeId];
        require(trade.state == State.FUNDED, "Invalid state for dispute");
        
        trade.state = State.DISPUTED;
        
        emit Disputed(tradeId, msg.sender, reason);
    }

    /**
     * @dev Resolve dispute (admin only)
     * @param tradeId The trade ID
     * @param to Address to receive funds
     * @param amount Amount to transfer
     * @param resolution Resolution description
     */
    function resolveDispute(
        uint256 tradeId, 
        address payable to, 
        uint256 amount,
        string calldata resolution
    ) external onlyOwner nonReentrant validTradeId(tradeId) {
        Trade storage trade = trades[tradeId];
        require(trade.state == State.DISPUTED, "Trade not disputed");
        require(amount <= trade.amount, "Amount exceeds trade value");
        require(to == trade.buyer || to == trade.seller, "Invalid recipient");
        
        trade.state = State.COMPLETE;
        
        if (amount > 0) {
            (bool sent, ) = to.call{value: amount}("");
            require(sent, "Transfer failed");
        }
        
        // If partial refund, send remainder to other party
        uint256 remainder = trade.amount - amount;
        if (remainder > 0) {
            address otherParty = (to == trade.buyer) ? trade.seller : trade.buyer;
            (bool remainderSent, ) = payable(otherParty).call{value: remainder}("");
            require(remainderSent, "Remainder transfer failed");
        }
        
        emit Resolved(tradeId, to, amount, resolution);
    }

    /**
     * @dev Refund buyer if trade has timed out
     * @param tradeId The trade ID
     */
    function timeoutRefund(uint256 tradeId) 
        external 
        nonReentrant 
        validTradeId(tradeId)
    {
        Trade storage trade = trades[tradeId];
        require(trade.state == State.FUNDED, "Trade not funded");
        require(block.timestamp >= trade.timeoutAt, "Trade not timed out");
        
        trade.state = State.COMPLETE;
        
        (bool sent, ) = payable(trade.buyer).call{value: trade.amount}("");
        require(sent, "Refund failed");
        
        emit TimeoutRefund(tradeId, trade.buyer, trade.amount);
    }

    /**
     * @dev Get trade details
     * @param tradeId The trade ID
     * @return Trade struct
     */
    function getTrade(uint256 tradeId) 
        external 
        view 
        validTradeId(tradeId) 
        returns (Trade memory) 
    {
        return trades[tradeId];
    }

    /**
     * @dev Update platform fee (admin only)
     * @param _feeBps New fee in basis points
     */
    function updatePlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee cannot exceed 10%"); // Max 10%
        platformFeeBps = _feeBps;
    }

    /**
     * @dev Update fee recipient (admin only)
     * @param _feeRecipient New fee recipient address
     */
    function updateFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Update default timeout duration (admin only)
     * @param _duration New timeout duration in seconds
     */
    function updateTimeoutDuration(uint256 _duration) external onlyOwner {
        require(_duration >= 1 days && _duration <= 90 days, "Invalid duration");
        defaultTimeoutDuration = _duration;
    }

    /**
     * @dev Emergency withdrawal (admin only, for stuck funds)
     * @param to Address to send funds
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address payable to, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(to != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "Emergency withdrawal failed");
    }

    /**
     * @dev Get contract balance
     * @return Contract balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get total number of trades
     * @return Total trade count
     */
    function getTotalTrades() external view returns (uint256) {
        return nextTradeId;
    }
}
