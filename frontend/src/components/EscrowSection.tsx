"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, 
  Wallet, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  FileText
} from "lucide-react";
import { web3Service, isMetaMaskInstalled } from "@/lib/web3";
import { escrowApi } from "@/lib/api";

interface EscrowSectionProps {
  contractId: number;
  contract: any;
  user: any;
}

interface EscrowData {
  id: number;
  state: string;
  amount_wei: number;
  amount_eth: number;
  onchain_tx_hash?: string;
  onchain_trade_id?: number;
  dispute_reason?: string;
  created_at: string;
  funded_at?: string;
  completed_at?: string;
  disputed_at?: string;
  timeout_at?: string;
  can_be_funded: boolean;
  can_confirm_delivery: boolean;
  can_raise_dispute: boolean;
  can_timeout_refund: boolean;
  events: any[];
}

export default function EscrowSection({ contractId, contract, user }: EscrowSectionProps) {
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [fundingMethod, setFundingMethod] = useState<"metamask" | "custodial">("metamask");
  const [disputeReason, setDisputeReason] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const isBuyer = contract.buyer_id === user.id;
  const isSeller = contract.seller_id === user.id;

  // Query escrow data
  const { data: escrowData, isLoading } = useQuery<EscrowData>({
    queryKey: ["escrow", contractId],
    queryFn: async () => {
      try {
        const response = await escrowApi.getEscrowByContract(contractId);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null; // No escrow exists yet
        }
        throw error;
      }
    },
    enabled: !!contractId,
  });

  // Create escrow mutation
  const createEscrowMutation = useMutation({
    mutationFn: escrowApi.createEscrow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow", contractId] });
      setShowCreateModal(false);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to create escrow");
    },
  });

  // Fund escrow mutation
  const fundEscrowMutation = useMutation({
    mutationFn: escrowApi.fundEscrow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow", contractId] });
      setShowFundModal(false);
      setTxHash("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to fund escrow");
    },
  });

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: escrowApi.confirmDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow", contractId] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to confirm delivery");
    },
  });

  // Raise dispute mutation
  const raiseDisputeMutation = useMutation({
    mutationFn: escrowApi.raiseDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow", contractId] });
      setShowDisputeModal(false);
      setDisputeReason("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to raise dispute");
    },
  });

  const connectWallet = async () => {
    try {
      const address = await web3Service.connectWallet();
      setWalletAddress(address);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleCreateEscrow = async () => {
    setError("");
    
    const expectedAmountEth = contract.qty_kg * contract.offer_price_per_kg / 100; // Convert to ETH equivalent
    const expectedAmountWei = web3Service.ethToWei(expectedAmountEth.toString());

    createEscrowMutation.mutate({
      contract_id: contractId,
      buyer_id: contract.buyer_id,
      seller_id: contract.seller_id,
      expected_amount_wei: parseInt(expectedAmountWei),
      create_on_chain: false,
      metadata: {
        commodity: contract.listing_ref,
        quantity_kg: contract.qty_kg,
        price_per_kg: contract.offer_price_per_kg
      }
    });
  };

  const handleFundEscrow = async () => {
    if (!escrowData) return;
    
    setError("");

    if (fundingMethod === "metamask") {
      if (!walletAddress) {
        setError("Please connect your wallet first");
        return;
      }

      if (!txHash) {
        setError("Please provide transaction hash");
        return;
      }

      fundEscrowMutation.mutate({
        escrow_id: escrowData.id,
        tx_hash: txHash,
        use_custodial: false
      });
    } else {
      // Custodial funding
      fundEscrowMutation.mutate({
        escrow_id: escrowData.id,
        use_custodial: true
      });
    }
  };

  const handleMetaMaskFunding = async () => {
    if (!escrowData || !walletAddress) return;

    try {
      setError("");
      
      const sellerAddress = "0x" + "0".repeat(40); // Placeholder - should get from seller profile
      const amountEth = escrowData.amount_eth.toString();
      
      const result = await web3Service.createAndFundTrade(
        sellerAddress,
        amountEth,
        {
          escrow_id: escrowData.id,
          contract_id: contractId
        }
      );

      // Auto-submit the transaction hash
      fundEscrowMutation.mutate({
        escrow_id: escrowData.id,
        tx_hash: result.txHash,
        use_custodial: false
      });

    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleConfirmDelivery = () => {
    if (!escrowData) return;

    confirmDeliveryMutation.mutate({
      escrow_id: escrowData.id,
      use_custodial: true // For simplicity, use custodial
    });
  };

  const handleRaiseDispute = () => {
    if (!escrowData || !disputeReason.trim()) return;

    raiseDisputeMutation.mutate({
      escrow_id: escrowData.id,
      reason: disputeReason,
      evidence_urls: []
    });
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "awaiting_fund": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
      case "funded": return "text-blue-600 bg-blue-100 dark:bg-blue-900/20";
      case "complete": return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "disputed": return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-900/20";
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case "awaiting_fund": return <Clock className="h-4 w-4" />;
      case "funded": return <Shield className="h-4 w-4" />;
      case "complete": return <CheckCircle className="h-4 w-4" />;
      case "disputed": return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Escrow Protection
        </h3>
        
        {escrowData && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStateColor(escrowData.state)}`}>
            {getStateIcon(escrowData.state)}
            {escrowData.state.replace("_", " ").toUpperCase()}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!escrowData ? (
        // No escrow exists - show create option
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Secure Your Trade
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create an escrow to protect both buyer and seller with blockchain security.
          </p>
          
          {isBuyer && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              disabled={createEscrowMutation.isPending}
            >
              {createEscrowMutation.isPending ? "Creating..." : "Create Escrow"}
            </button>
          )}
        </div>
      ) : (
        // Escrow exists - show status and actions
        <div className="space-y-6">
          {/* Escrow Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Escrow Amount</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {escrowData.amount_eth.toFixed(4)} MATIC
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(escrowData.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Hash */}
          {escrowData.onchain_tx_hash && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <ExternalLink className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Transaction</p>
                <a
                  href={web3Service.getPolygonscanUrl(escrowData.onchain_tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-mono"
                >
                  {web3Service.formatAddress(escrowData.onchain_tx_hash)}
                </a>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Fund Escrow */}
            {escrowData.can_be_funded && isBuyer && (
              <button
                onClick={() => setShowFundModal(true)}
                className="btn-primary w-full"
                disabled={fundEscrowMutation.isPending}
              >
                {fundEscrowMutation.isPending ? "Funding..." : "Fund Escrow"}
              </button>
            )}

            {/* Confirm Delivery */}
            {escrowData.can_confirm_delivery && (
              <button
                onClick={handleConfirmDelivery}
                className="btn-secondary w-full"
                disabled={confirmDeliveryMutation.isPending}
              >
                {confirmDeliveryMutation.isPending ? "Confirming..." : "Confirm Delivery"}
              </button>
            )}

            {/* Raise Dispute */}
            {escrowData.can_raise_dispute && (
              <button
                onClick={() => setShowDisputeModal(true)}
                className="btn-tertiary w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Raise Dispute
              </button>
            )}
          </div>

          {/* Dispute Information */}
          {escrowData.state === "disputed" && escrowData.dispute_reason && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-100">Dispute Active</h4>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                    {escrowData.dispute_reason}
                  </p>
                  <p className="text-red-600 dark:text-red-400 text-xs mt-2">
                    Disputed on {new Date(escrowData.disputed_at!).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Escrow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Escrow
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This will create a secure escrow for your trade. Funds will be held safely until delivery is confirmed.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-tertiary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEscrow}
                  disabled={createEscrowMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createEscrowMutation.isPending ? "Creating..." : "Create Escrow"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund Escrow Modal */}
      {showFundModal && escrowData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Fund Escrow
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Amount to fund: <span className="font-medium">{escrowData.amount_eth.toFixed(4)} MATIC</span>
                </p>
              </div>

              {/* Funding Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Funding Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="metamask"
                      checked={fundingMethod === "metamask"}
                      onChange={(e) => setFundingMethod(e.target.value as "metamask")}
                      className="mr-2"
                    />
                    <Wallet className="h-4 w-4 mr-2" />
                    MetaMask Wallet
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="custodial"
                      checked={fundingMethod === "custodial"}
                      onChange={(e) => setFundingMethod(e.target.value as "custodial")}
                      className="mr-2"
                    />
                    <Shield className="h-4 w-4 mr-2" />
                    Custodial (Test Mode)
                  </label>
                </div>
              </div>

              {fundingMethod === "metamask" && (
                <div className="space-y-3">
                  {!walletAddress ? (
                    <button
                      onClick={connectWallet}
                      className="btn-secondary w-full"
                      disabled={!isMetaMaskInstalled()}
                    >
                      {!isMetaMaskInstalled() ? "Install MetaMask" : "Connect Wallet"}
                    </button>
                  ) : (
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                        Connected: {web3Service.formatAddress(walletAddress)}
                      </p>
                      <button
                        onClick={handleMetaMaskFunding}
                        className="btn-primary w-full"
                      >
                        Fund with MetaMask
                      </button>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Or paste transaction hash:
                    </label>
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="0x..."
                      className="input"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFundModal(false)}
                  className="btn-tertiary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFundEscrow}
                  disabled={fundEscrowMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {fundEscrowMutation.isPending ? "Funding..." : "Fund Escrow"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Raise Dispute
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Dispute *
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={4}
                  placeholder="Please describe the issue with this trade..."
                  className="input min-h-[120px] resize-none"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDisputeModal(false);
                    setDisputeReason("");
                  }}
                  className="btn-tertiary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaiseDispute}
                  disabled={raiseDisputeMutation.isPending || !disputeReason.trim()}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {raiseDisputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
