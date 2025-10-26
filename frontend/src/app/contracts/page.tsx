"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Calendar, User, Package, Eye } from "lucide-react";
import { contractsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Contract, ContractStatus } from "@/lib/types";
import Navbar from "@/components/Navbar";

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  offered: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  awaiting_settlement: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
};

export default function ContractsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isChecking } = useAuth("/login");
  const [filter, setFilter] = useState<ContractStatus | "ALL">("ALL");

  const { data: contractsData, isLoading } = useQuery({
    queryKey: ["contracts", user?.id],
    queryFn: () => contractsApi.getContracts(user?.id),
    enabled: !!user,
  });

  const filteredContracts = contractsData?.contracts?.filter((contract: Contract) => 
    filter === "ALL" || contract.status === filter
  ) || [];

  const getStatusBadge = (status: ContractStatus) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
      {status.replace("_", " ")}
    </span>
  );

  const getContractRole = (contract: Contract) => {
    if (!user) return "";
    return contract.buyer_id === user.id ? "Buyer" : "Seller";
  };

  if (authLoading || isChecking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">My Contracts</h1>
              <p className="text-gray-600">Manage your offers and agreements</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Filter by Status</h2>
            <div className="flex space-x-2">
              {["ALL", "OFFERED", "ACCEPTED", "AWAITING_SETTLEMENT", "COMPLETED", "DISPUTED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as ContractStatus | "ALL")}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status === "ALL" ? "All" : status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contracts List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4 w-1/2"></div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredContracts.length > 0 ? (
          <div className="space-y-4">
            {filteredContracts.map((contract: Contract) => (
              <div key={contract.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Contract #{contract.id}
                      </h3>
                      {getStatusBadge(contract.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      {contract.listing_ref} • Role: {getContractRole(contract)}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-xs text-gray-500">Counterparty</p>
                          <p className="font-medium">{contract.counterparty_name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-xs text-gray-500">Quantity</p>
                          <p className="font-medium">{contract.qty_kg.toLocaleString()} kg</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <FileText className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-xs text-gray-500">Price</p>
                          <p className="font-medium">₹{contract.offer_price_per_kg}/kg</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="font-medium">
                            {new Date(contract.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Total Value: <span className="font-semibold text-gray-900">
                      ₹{(contract.qty_kg * contract.offer_price_per_kg).toLocaleString()}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === "ALL" ? "No contracts found" : `No ${filter.toLowerCase().replace("_", " ")} contracts`}
            </h3>
            <p className="text-gray-600 mb-4">
              {user.role === "buyer" 
                ? "Start by browsing listings and making offers."
                : "Create listings to receive offers from buyers."
              }
            </p>
            <button
              onClick={() => router.push(user.role === "buyer" ? "/listings" : "/listings/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              {user.role === "buyer" ? "Browse Listings" : "Create Listing"}
            </button>
          </div>
        )}

        {/* Summary Stats */}
        {contractsData?.contracts && contractsData.contracts.length > 0 && (
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Contract Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(statusColors).map(([status, colorClass]) => {
                const count = contractsData?.contracts?.filter((c: Contract) => c.status === status).length || 0;
                return (
                  <div key={status} className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-500">{status.replace("_", " ")}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
