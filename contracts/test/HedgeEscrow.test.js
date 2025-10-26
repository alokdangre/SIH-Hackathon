const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HedgeEscrow", function () {
  let escrow;
  let owner, buyer, seller, feeRecipient, other;
  let tradeAmount;

  beforeEach(async function () {
    [owner, buyer, seller, feeRecipient, other] = await ethers.getSigners();
    
    const HedgeEscrow = await ethers.getContractFactory("HedgeEscrow");
    escrow = await HedgeEscrow.deploy(feeRecipient.address);
    await escrow.deployed();

    tradeAmount = ethers.utils.parseEther("1.0"); // 1 MATIC
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("Should set the correct fee recipient", async function () {
      expect(await escrow.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set default platform fee to 1%", async function () {
      expect(await escrow.platformFeeBps()).to.equal(100);
    });
  });

  describe("Trade Creation and Funding", function () {
    it("Should create and fund trade in one transaction", async function () {
      const metadata = JSON.stringify({ contractId: 1, commodity: "soymeal" });
      
      const tx = await escrow.connect(buyer).createAndFundTrade(
        seller.address,
        metadata,
        { value: tradeAmount }
      );

      const receipt = await tx.wait();
      const tradeId = 0;

      // Check events
      expect(receipt.events).to.have.lengthOf(2);
      expect(receipt.events[0].event).to.equal("EscrowCreated");
      expect(receipt.events[1].event).to.equal("Funded");

      // Check trade details
      const trade = await escrow.getTrade(tradeId);
      expect(trade.buyer).to.equal(buyer.address);
      expect(trade.seller).to.equal(seller.address);
      expect(trade.amount).to.equal(tradeAmount);
      expect(trade.state).to.equal(1); // FUNDED
      expect(trade.metadata).to.equal(metadata);
    });

    it("Should create trade without funding", async function () {
      const metadata = JSON.stringify({ contractId: 1 });
      
      const tx = await escrow.connect(buyer).createTradeWithoutFund(
        seller.address,
        metadata
      );

      const receipt = await tx.wait();
      const tradeId = 0;

      // Check event
      expect(receipt.events).to.have.lengthOf(1);
      expect(receipt.events[0].event).to.equal("EscrowCreated");

      // Check trade details
      const trade = await escrow.getTrade(tradeId);
      expect(trade.buyer).to.equal(buyer.address);
      expect(trade.seller).to.equal(seller.address);
      expect(trade.amount).to.equal(0);
      expect(trade.state).to.equal(0); // AWAITING_FUND
    });

    it("Should fund existing trade", async function () {
      // Create trade without funding
      await escrow.connect(buyer).createTradeWithoutFund(
        seller.address,
        "{}"
      );

      // Fund the trade
      const tx = await escrow.connect(buyer).fundTrade(0, { value: tradeAmount });
      const receipt = await tx.wait();

      // Check event
      expect(receipt.events[0].event).to.equal("Funded");

      // Check trade state
      const trade = await escrow.getTrade(0);
      expect(trade.amount).to.equal(tradeAmount);
      expect(trade.state).to.equal(1); // FUNDED
    });

    it("Should reject invalid seller address", async function () {
      await expect(
        escrow.connect(buyer).createAndFundTrade(
          ethers.constants.AddressZero,
          "{}",
          { value: tradeAmount }
        )
      ).to.be.revertedWith("Invalid seller address");
    });

    it("Should reject buyer as seller", async function () {
      await expect(
        escrow.connect(buyer).createAndFundTrade(
          buyer.address,
          "{}",
          { value: tradeAmount }
        )
      ).to.be.revertedWith("Buyer and seller cannot be same");
    });
  });

  describe("Delivery Confirmation", function () {
    beforeEach(async function () {
      // Create and fund a trade
      await escrow.connect(buyer).createAndFundTrade(
        seller.address,
        "{}",
        { value: tradeAmount }
      );
    });

    it("Should allow seller to confirm delivery", async function () {
      const initialSellerBalance = await seller.getBalance();
      const initialFeeRecipientBalance = await feeRecipient.getBalance();

      const tx = await escrow.connect(seller).confirmDelivery(0);
      const receipt = await tx.wait();

      // Check events
      expect(receipt.events).to.have.lengthOf(2);
      expect(receipt.events[0].event).to.equal("DeliveryConfirmed");
      expect(receipt.events[1].event).to.equal("Released");

      // Check trade state
      const trade = await escrow.getTrade(0);
      expect(trade.state).to.equal(3); // COMPLETE

      // Check balances (seller gets amount minus 1% fee)
      const expectedFee = tradeAmount.mul(100).div(10000); // 1%
      const expectedSellerAmount = tradeAmount.sub(expectedFee);
      
      const finalSellerBalance = await seller.getBalance();
      const finalFeeRecipientBalance = await feeRecipient.getBalance();

      // Account for gas costs in seller balance check
      expect(finalSellerBalance).to.be.gt(initialSellerBalance.add(expectedSellerAmount).sub(ethers.utils.parseEther("0.01")));
      expect(finalFeeRecipientBalance).to.equal(initialFeeRecipientBalance.add(expectedFee));
    });

    it("Should allow buyer to confirm delivery", async function () {
      const tx = await escrow.connect(buyer).confirmDelivery(0);
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("DeliveryConfirmed");
      
      const trade = await escrow.getTrade(0);
      expect(trade.state).to.equal(3); // COMPLETE
    });

    it("Should reject confirmation from non-parties", async function () {
      await expect(
        escrow.connect(other).confirmDelivery(0)
      ).to.be.revertedWith("Only trade parties allowed");
    });

    it("Should reject confirmation of unfunded trade", async function () {
      // Create unfunded trade
      await escrow.connect(buyer).createTradeWithoutFund(seller.address, "{}");
      
      await expect(
        escrow.connect(seller).confirmDelivery(1)
      ).to.be.revertedWith("Trade not funded");
    });
  });

  describe("Dispute Handling", function () {
    beforeEach(async function () {
      // Create and fund a trade
      await escrow.connect(buyer).createAndFundTrade(
        seller.address,
        "{}",
        { value: tradeAmount }
      );
    });

    it("Should allow buyer to raise dispute", async function () {
      const reason = "Quality issues with delivery";
      
      const tx = await escrow.connect(buyer).raiseDispute(0, reason);
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("Disputed");
      expect(receipt.events[0].args.by).to.equal(buyer.address);
      expect(receipt.events[0].args.reason).to.equal(reason);

      const trade = await escrow.getTrade(0);
      expect(trade.state).to.equal(4); // DISPUTED
    });

    it("Should allow seller to raise dispute", async function () {
      const reason = "Buyer refusing to confirm delivery";
      
      const tx = await escrow.connect(seller).raiseDispute(0, reason);
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("Disputed");
      expect(receipt.events[0].args.by).to.equal(seller.address);
    });

    it("Should reject dispute from non-parties", async function () {
      await expect(
        escrow.connect(other).raiseDispute(0, "Invalid dispute")
      ).to.be.revertedWith("Only trade parties allowed");
    });

    it("Should allow admin to resolve dispute with full refund", async function () {
      // Raise dispute first
      await escrow.connect(buyer).raiseDispute(0, "Quality issues");

      const initialBuyerBalance = await buyer.getBalance();
      
      const tx = await escrow.connect(owner).resolveDispute(
        0,
        buyer.address,
        tradeAmount,
        "Refund approved due to quality issues"
      );
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("Resolved");
      
      const trade = await escrow.getTrade(0);
      expect(trade.state).to.equal(3); // COMPLETE

      const finalBuyerBalance = await buyer.getBalance();
      expect(finalBuyerBalance).to.equal(initialBuyerBalance.add(tradeAmount));
    });

    it("Should allow admin to resolve dispute with partial refund", async function () {
      await escrow.connect(buyer).raiseDispute(0, "Partial quality issues");

      const partialAmount = tradeAmount.div(2); // 50% refund
      const initialBuyerBalance = await buyer.getBalance();
      const initialSellerBalance = await seller.getBalance();
      
      await escrow.connect(owner).resolveDispute(
        0,
        buyer.address,
        partialAmount,
        "Partial refund approved"
      );

      const finalBuyerBalance = await buyer.getBalance();
      const finalSellerBalance = await seller.getBalance();
      
      expect(finalBuyerBalance).to.equal(initialBuyerBalance.add(partialAmount));
      expect(finalSellerBalance).to.equal(initialSellerBalance.add(partialAmount));
    });

    it("Should reject dispute resolution from non-admin", async function () {
      await escrow.connect(buyer).raiseDispute(0, "Quality issues");

      await expect(
        escrow.connect(buyer).resolveDispute(0, buyer.address, tradeAmount, "Self resolution")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Timeout Handling", function () {
    it("Should allow timeout refund after expiry", async function () {
      // Create and fund trade
      await escrow.connect(buyer).createAndFundTrade(
        seller.address,
        "{}",
        { value: tradeAmount }
      );

      // Fast forward time beyond timeout (30 days + 1 second)
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      const initialBuyerBalance = await buyer.getBalance();
      
      const tx = await escrow.connect(buyer).timeoutRefund(0);
      const receipt = await tx.wait();

      expect(receipt.events[0].event).to.equal("TimeoutRefund");
      
      const trade = await escrow.getTrade(0);
      expect(trade.state).to.equal(3); // COMPLETE

      const finalBuyerBalance = await buyer.getBalance();
      // Account for gas costs
      expect(finalBuyerBalance).to.be.gt(initialBuyerBalance.add(tradeAmount).sub(ethers.utils.parseEther("0.01")));
    });

    it("Should reject timeout refund before expiry", async function () {
      await escrow.connect(buyer).createAndFundTrade(
        seller.address,
        "{}",
        { value: tradeAmount }
      );

      await expect(
        escrow.connect(buyer).timeoutRefund(0)
      ).to.be.revertedWith("Trade not timed out");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update platform fee", async function () {
      await escrow.connect(owner).updatePlatformFee(200); // 2%
      expect(await escrow.platformFeeBps()).to.equal(200);
    });

    it("Should reject platform fee above 10%", async function () {
      await expect(
        escrow.connect(owner).updatePlatformFee(1001) // 10.01%
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });

    it("Should allow admin to update fee recipient", async function () {
      await escrow.connect(owner).updateFeeRecipient(other.address);
      expect(await escrow.feeRecipient()).to.equal(other.address);
    });

    it("Should allow admin to update timeout duration", async function () {
      const newDuration = 7 * 24 * 60 * 60; // 7 days
      await escrow.connect(owner).updateTimeoutDuration(newDuration);
      expect(await escrow.defaultTimeoutDuration()).to.equal(newDuration);
    });

    it("Should reject invalid timeout duration", async function () {
      await expect(
        escrow.connect(owner).updateTimeoutDuration(12 * 60 * 60) // 12 hours (too short)
      ).to.be.revertedWith("Invalid duration");
    });
  });

  describe("View Functions", function () {
    it("Should return correct contract balance", async function () {
      await escrow.connect(buyer).createAndFundTrade(
        seller.address,
        "{}",
        { value: tradeAmount }
      );

      expect(await escrow.getBalance()).to.equal(tradeAmount);
    });

    it("Should return correct total trades count", async function () {
      expect(await escrow.getTotalTrades()).to.equal(0);
      
      await escrow.connect(buyer).createTradeWithoutFund(seller.address, "{}");
      expect(await escrow.getTotalTrades()).to.equal(1);
      
      await escrow.connect(buyer).createAndFundTrade(seller.address, "{}", { value: tradeAmount });
      expect(await escrow.getTotalTrades()).to.equal(2);
    });
  });
});
