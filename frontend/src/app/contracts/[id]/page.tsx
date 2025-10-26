"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Calendar, User, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { contractsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ContractStatus } from "@/lib/types";

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  offered: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  awaiting_settlement: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Contract not found</h2>
          <p className="text-gray-600 mb-4">The contract you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push("/contracts")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                Contract #{contract.id}
              </h1>
              <p className="text-gray-600">
                {contract.listing_ref} • Role: {isBuyer ? "Buyer" : "Seller"}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[contract.status]}`}>
              {contract.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Counterparty</p>
                      <p className="font-medium">{contract.counterparty_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-medium">{contract.qty_kg.toLocaleString()} kg</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Price per kg</p>
                      <p className="font-medium">₹{contract.offer_price_per_kg}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="font-medium">
                        {new Date(contract.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Value:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{(contract.qty_kg * contract.offer_price_per_kg).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {contract.timeline && contract.timeline.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Timeline</h2>
                
                <div className="space-y-4">
                  {contract.timeline.map((event, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">
                            {event.action.replace("_", " ").toUpperCase()}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Status changed to: {event.status.replace("_", " ")}
                        </p>
                        {event.payload && Object.keys(event.payload).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {JSON.stringify(event.payload, null, 2)}
                          </div>
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
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                {canAccept && (
                  <button
                    onClick={handleAccept}
                    disabled={acceptMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{acceptMutation.isPending ? "Accepting..." : "Accept Offer"}</span>
                  </button>
                )}
                
                {canConfirmDelivery && (
                  <button
                    onClick={handleConfirmDelivery}
                    disabled={confirmDeliveryMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{confirmDeliveryMutation.isPending ? "Confirming..." : "Confirm Delivery"}</span>
                  </button>
                )}
                
                {canDispute && (
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md font-medium flex items-center justify-center space-x-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Raise Dispute</span>
                  </button>
                )}
                
                <button
                  onClick={() => router.push("/contracts")}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-md font-medium hover:bg-gray-50"
                >
                  Back to Contracts
                </button>
              </div>
            </div>

            {/* Contract Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Information</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Contract ID:</span>
                  <span className="font-medium">#{contract.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Listing ID:</span>
                  <span className="font-medium">#{contract.listing_id}</span>
                </div>
                
                {contract.expiry_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expires:</span>
                    <span className="font-medium">
                      {new Date(contract.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="font-medium">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Raise Dispute</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Dispute *
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={4}
                  placeholder="Please describe the issue with this contract..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowDisputeModal(false);
                    setDisputeReason("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaiseDispute}
                  disabled={disputeMutation.isPending || !disputeReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
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
