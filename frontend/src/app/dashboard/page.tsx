"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, TrendingUp, FileText, AlertCircle } from "lucide-react";
import { listingsApi, contractsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isChecking } = useAuth("/login");

  const { data: listingsData } = useQuery({
    queryKey: ["listings", { limit: 5 }],
    queryFn: () => listingsApi.getListings({ limit: 5 }),
    enabled: !!user,
  });

  const { data: contractsData } = useQuery({
    queryKey: ["contracts", user?.id],
    queryFn: () => contractsApi.getContracts(user?.id),
    enabled: !!user,
  });

  if (isLoading || isChecking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const totalListings = listingsData?.meta?.total || 0;
  const openContracts = contractsData?.contracts?.filter(
    (c) => c.status === "offered" || c.status === "accepted"
  ).length || 0;
  const pendingOffers = contractsData?.contracts?.filter(
    (c) => c.status === "offered"
  ).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Welcome back, {user.name}</p>
            </div>
            <div className="flex space-x-4">
              {user.role === "farmer" && (
                <button
                  onClick={() => router.push("/listings/create")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Listing</span>
                </button>
              )}
              <button
                onClick={() => router.push("/contracts")}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>View Contracts</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Listings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalListings}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Open Contracts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {openContracts}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Offers
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {pendingOffers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {user.role === "farmer" && (
              <button
                onClick={() => router.push("/listings/create")}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
              >
                <Plus className="h-6 w-6 text-blue-600 mb-2" />
                <h3 className="font-medium text-gray-900">Create Listing</h3>
                <p className="text-sm text-gray-500">
                  Upload photos and enter quantity (kg)
                </p>
              </button>
            )}
            <button
              onClick={() => router.push("/listings")}
              className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            >
              <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Browse Listings</h3>
              <p className="text-sm text-gray-500">
                Find commodities to purchase
              </p>
            </button>
            <button
              onClick={() => router.push("/contracts")}
              className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            >
              <FileText className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-900">View Contracts</h3>
              <p className="text-sm text-gray-500">
                Manage your offers and agreements
              </p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h2>
          {contractsData?.contracts?.length ? (
            <div className="space-y-4">
              {contractsData.contracts.slice(0, 5).map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {contract.listing_ref}
                    </p>
                    <p className="text-sm text-gray-500">
                      {contract.counterparty_name} • {contract.qty_kg} kg • ₹
                      {contract.offer_price_per_kg}/kg
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      contract.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : contract.status === "accepted"
                        ? "bg-blue-100 text-blue-800"
                        : contract.status === "offered"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {contract.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No recent activity to display
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
