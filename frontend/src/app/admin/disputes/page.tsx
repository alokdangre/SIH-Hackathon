"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  User,
  FileText,
  ExternalLink
} from "lucide-react";
import { escrowApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { web3Service } from "@/lib/web3";

interface DisputeData {
  id: number;
  contract_id: number;
  buyer_id: number;
  seller_id: number;
  amount_wei: number;
  amount_eth: number;
  state: string;
  dispute_reason: string;
  onchain_tx_hash?: string;
  created_at: string;
  disputed_at: string;
  events: any[];
}

export default function AdminDisputesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth("/login");
  const [selectedDispute, setSelectedDispute] = useState<DisputeData | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState({
    outcome: "refund" as "refund" | "payout" | "partial",
    payout_address: "",
    payout_amount_eth: "",
    resolution_notes: ""
  });
  const [error, setError] = useState("");

  // Query disputes
  const { data: disputesData, isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: () => escrowApi.listDisputes(),
    enabled: !!user && user.role === "admin",
  });

  // Resolve dispute mutation
  const resolveDisputeMutation = useMutation({
    mutationFn: escrowApi.resolveDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      setShowResolveModal(false);
      setSelectedDispute(null);
      setResolution({
        outcome: "refund",
        payout_address: "",
        payout_amount_eth: "",
        resolution_notes: ""
      });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to resolve dispute");
    },
  });

  const handleResolveDispute = () => {
    if (!selectedDispute || !resolution.resolution_notes.trim()) {
      setError("Please provide resolution notes");
      return;
    }

    setError("");

    const payload: any = {
      escrow_id: selectedDispute.id,
      outcome: resolution.outcome,
      resolution_notes: resolution.resolution_notes
    };

    if (resolution.outcome === "payout") {
      payload.payout_address = resolution.payout_address || undefined;
      payload.payout_amount_wei = selectedDispute.amount_wei;
    } else if (resolution.outcome === "partial") {
      if (!resolution.payout_amount_eth || !resolution.payout_address) {
        setError("Partial resolution requires payout address and amount");
        return;
      }
      payload.payout_address = resolution.payout_address;
      payload.payout_amount_wei = parseInt(web3Service.ethToWei(resolution.payout_amount_eth));
    } else {
      // Refund - no additional fields needed
      payload.payout_amount_wei = selectedDispute.amount_wei;
    }

    resolveDisputeMutation.mutate(payload);
  };

  const openResolveModal = (dispute: DisputeData) => {
    setSelectedDispute(dispute);
    setShowResolveModal(true);
    setError("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Admin access required</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dispute Resolution</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage and resolve escrow disputes</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : disputesData?.disputes?.length ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Active Disputes ({disputesData.total})
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {disputesData.disputes.map((dispute: DisputeData) => (
                <div key={dispute.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Escrow #{dispute.id}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Contract #{dispute.contract_id} • Disputed {new Date(dispute.disputed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dispute.amount_eth.toFixed(4)} MATIC
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Escrow Amount
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Dispute Details</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          {dispute.dispute_reason}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Transaction Info</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Buyer ID: {dispute.buyer_id} • Seller ID: {dispute.seller_id}
                          </span>
                        </div>
                        
                        {dispute.onchain_tx_hash && (
                          <div className="flex items-center gap-2 text-sm">
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                            <a
                              href={web3Service.getPolygonscanUrl(dispute.onchain_tx_hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              View on Polygonscan
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => openResolveModal(dispute)}
                      className="btn-primary"
                      disabled={resolveDisputeMutation.isPending}
                    >
                      Resolve Dispute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full w-fit mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Active Disputes
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              All escrow disputes have been resolved.
            </p>
          </div>
        )}
      </main>

      {/* Resolve Dispute Modal */}
      {showResolveModal && selectedDispute && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resolve Dispute - Escrow #{selectedDispute.id}
            </h3>
            
            <div className="space-y-6">
              {/* Dispute Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dispute Summary</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Amount:</strong> {selectedDispute.amount_eth.toFixed(4)} MATIC
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Reason:</strong> {selectedDispute.dispute_reason}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Disputed:</strong> {new Date(selectedDispute.disputed_at).toLocaleString()}
                </p>
              </div>

              {/* Resolution Outcome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resolution Outcome *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="refund"
                      checked={resolution.outcome === "refund"}
                      onChange={(e) => setResolution(prev => ({ ...prev, outcome: e.target.value as any }))}
                      className="mr-2"
                    />
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                    Full Refund to Buyer
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="payout"
                      checked={resolution.outcome === "payout"}
                      onChange={(e) => setResolution(prev => ({ ...prev, outcome: e.target.value as any }))}
                      className="mr-2"
                    />
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Full Payout to Seller
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="partial"
                      checked={resolution.outcome === "partial"}
                      onChange={(e) => setResolution(prev => ({ ...prev, outcome: e.target.value as any }))}
                      className="mr-2"
                    />
                    <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
                    Partial Resolution
                  </label>
                </div>
              </div>

              {/* Partial Resolution Fields */}
              {resolution.outcome === "partial" && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payout Address *
                    </label>
                    <input
                      type="text"
                      value={resolution.payout_address}
                      onChange={(e) => setResolution(prev => ({ ...prev, payout_address: e.target.value }))}
                      placeholder="0x..."
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payout Amount (MATIC) *
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      max={selectedDispute.amount_eth}
                      value={resolution.payout_amount_eth}
                      onChange={(e) => setResolution(prev => ({ ...prev, payout_amount_eth: e.target.value }))}
                      placeholder="0.0000"
                      className="input"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Max: {selectedDispute.amount_eth.toFixed(4)} MATIC
                    </p>
                  </div>
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resolution Notes *
                </label>
                <textarea
                  value={resolution.resolution_notes}
                  onChange={(e) => setResolution(prev => ({ ...prev, resolution_notes: e.target.value }))}
                  rows={4}
                  placeholder="Explain the reasoning behind this resolution..."
                  className="input min-h-[120px] resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedDispute(null);
                    setError("");
                  }}
                  className="btn-tertiary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveDispute}
                  disabled={resolveDisputeMutation.isPending || !resolution.resolution_notes.trim()}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {resolveDisputeMutation.isPending ? "Resolving..." : "Resolve Dispute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
