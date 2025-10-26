"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Calendar, User, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { contractsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ContractStatus } from "@/lib/types";
import Navbar from "@/components/Navbar";
import EscrowSection from "@/components/EscrowSection";

const statusClasses: Record<ContractStatus, string> = {
  draft: "badge badge-draft",
  offered: "badge badge-offered",
  accepted: "badge badge-accepted",
  awaiting_settlement: "badge badge-awaiting_settlement",
  completed: "badge badge-completed",
  disputed: "badge badge-disputed",
};

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isChecking } = useAuth("/login");
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [error, setError] = useState("");

  const contractId = Number(params.id);


  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => contractsApi.getContract(contractId),
    enabled: !!user && !!contractId,
  });

  const acceptMutation = useMutation({
    mutationFn: () => contractsApi.acceptContract(contractId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to accept contract");
    },
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: () => contractsApi.confirmDelivery(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to confirm delivery");
    },
  });

  const disputeMutation = useMutation({
    mutationFn: (reason: string) => contractsApi.raiseDispute(contractId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setShowDisputeModal(false);
      setDisputeReason("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to raise dispute");
    },
  });

  const handleAccept = () => {
    setError("");
    acceptMutation.mutate();
  };

  const handleConfirmDelivery = () => {
    setError("");
    confirmDeliveryMutation.mutate();
  };

  const handleRaiseDispute = () => {
    if (!disputeReason.trim()) {
      setError("Please provide a reason for the dispute");
      return;
    }
    setError("");
    disputeMutation.mutate(disputeReason);
  };

  if (authLoading || isChecking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="card animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Contract not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The contract you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push("/contracts")}
            className="btn-primary"
          >
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  const isBuyer = contract.buyer_id === user.id;
  const isSeller = contract.seller_id === user.id;
  const canAccept = isSeller && contract.status === "offered";
  const canConfirmDelivery = (isBuyer || isSeller) && contract.status === "accepted";
  const canDispute = (isBuyer || isSeller) && ["accepted", "awaiting_settlement"].includes(contract.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Contract #{contract.id}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {contract.listing_ref} • Role: {isBuyer ? "Buyer" : "Seller"}
              </p>
            </div>
            <span className={`${statusClasses[contract.status]} capitalize`}>
              {contract.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Details */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contract Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Counterparty</p>
                      <p className="font-medium text-gray-900 dark:text-white">{contract.counterparty_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Quantity</p>
                      <p className="font-medium text-gray-900 dark:text-white">{contract.qty_kg.toLocaleString()} kg</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Price per kg</p>
                      <p className="font-medium text-gray-900 dark:text-white">₹{contract.offer_price_per_kg}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(contract.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900 dark:text-white">Total Value:</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₹{(contract.qty_kg * contract.offer_price_per_kg).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Escrow Section */}
            <EscrowSection 
              contractId={contractId} 
              contract={contract} 
              user={user} 
            />

            {/* Timeline */}
            {contract.timeline && contract.timeline.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contract Timeline</h2>
                
                <div className="space-y-4">
                  {contract.timeline.map((event, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {event.action.replace("_", " ").toUpperCase()}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          Status changed to: {event.status.replace("_", " ")}
                        </p>
                        {event.payload && Object.keys(event.payload).length > 0 && (
                          <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-md p-3 overflow-x-auto">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
              
              <div className="space-y-3">
                {canAccept && (
                  <button
                    onClick={handleAccept}
                    disabled={acceptMutation.isPending}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{acceptMutation.isPending ? "Accepting..." : "Accept Offer"}</span>
                  </button>
                )}
                
                {canConfirmDelivery && (
                  <button
                    onClick={handleConfirmDelivery}
                    disabled={confirmDeliveryMutation.isPending}
                    className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{confirmDeliveryMutation.isPending ? "Confirming..." : "Confirm Delivery"}</span>
                  </button>
                )}
                
                {canDispute && (
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="btn-tertiary w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Raise Dispute</span>
                  </button>
                )}
                
                <button
                  onClick={() => router.push("/contracts")}
                  className="btn-tertiary w-full"
                >
                  Back to Contracts
                </button>
              </div>
            </div>

            {/* Contract Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contract Information</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Contract ID:</span>
                  <span className="font-medium text-gray-900 dark:text-white">#{contract.id}</span>
                </div>
                
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Listing ID:</span>
                  <span className="font-medium text-gray-900 dark:text-white">#{contract.listing_id}</span>
                </div>
                
                {contract.expiry_date && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Expires:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(contract.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Last Updated:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(contract.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Raise Dispute</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Dispute *
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={4}
                  placeholder="Please describe the issue with this contract..."
                  className="input min-h-[120px] resize-none"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowDisputeModal(false);
                    setDisputeReason("");
                    setError("");
                  }}
                  className="btn-tertiary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaiseDispute}
                  disabled={disputeMutation.isPending || !disputeReason.trim()}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {disputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
