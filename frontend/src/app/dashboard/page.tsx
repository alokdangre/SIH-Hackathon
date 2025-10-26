"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, TrendingUp, FileText, AlertCircle, User as UserIcon, Package as PackageIcon } from "lucide-react";
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
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900 dark:text-white">Loading your dashboard...</p>
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
      <header className="relative overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="animate-fade-in">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Dashboard</h1>
              <p className="text-lg mt-2 text-gray-600 dark:text-gray-400">Welcome back, <span className="font-semibold text-gray-900 dark:text-white">{user.name}</span></p>
            </div>
            <div className="flex space-x-3 animate-fade-in">
              {user.role === "farmer" && (
                <button
                  onClick={() => router.push("/listings/create")}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Listing</span>
                </button>
              )}
              <button
                onClick={() => router.push("/contracts")}
                className="btn-secondary"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
          <div className="card-hover group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-200">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Listings
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900 dark:text-white">
                    {totalListings}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="card-hover group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg group-hover:from-green-600 group-hover:to-green-700 transition-all duration-200">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Open Contracts
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900 dark:text-white">
                    {openContracts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="card-hover group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg group-hover:from-orange-600 group-hover:to-orange-700 transition-all duration-200">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Pending Offers
                  </dt>
                  <dd className="text-3xl font-bold text-gray-900 dark:text-white">
                    {pendingOffers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card animate-fade-in">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {user.role === "farmer" && (
              <button
                onClick={() => router.push("/listings/create")}
                className="card-hover group p-6 text-left"
              >
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg w-fit mb-4 group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-200">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Create Listing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload photos and enter quantity (kg)
                </p>
              </button>
            )}
            <button
              onClick={() => router.push("/listings")}
              className="card-hover group p-6 text-left"
            >
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg w-fit mb-4 group-hover:from-green-600 group-hover:to-green-700 transition-all duration-200">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Browse Listings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Find commodities to purchase
              </p>
            </button>
            <button
              onClick={() => router.push("/contracts")}
              className="card-hover group p-6 text-left"
            >
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg w-fit mb-4 group-hover:from-purple-600 group-hover:to-purple-700 transition-all duration-200">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">View Contracts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your offers and agreements
              </p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <button
              onClick={() => router.push("/contracts")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              View All
            </button>
          </div>
          {contractsData?.contracts?.length ? (
            <div className="space-y-3">
              {contractsData.contracts.slice(0, 5).map((contract) => (
                <div
                  key={contract.id}
                  className="group p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/contracts/${contract.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {contract.listing_ref || `Contract #${contract.id}`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {contract.counterparty_name}
                        </span>
                        <span className="flex items-center">
                          <PackageIcon className="h-3 w-3 mr-1" />
                          {contract.qty_kg.toLocaleString()} kg
                        </span>
                        <span className="flex items-center font-medium text-green-600 dark:text-green-400">
                          ₹{contract.offer_price_per_kg}/kg
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(contract.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Total: ₹{(contract.qty_kg * contract.offer_price_per_kg).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`badge badge-${contract.status}`}>
                        {contract.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No recent activity
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {user.role === "buyer" 
                  ? "Start browsing listings to make your first offer."
                  : "Create your first listing to receive offers from buyers."
                }
              </p>
              <button
                onClick={() => router.push(user.role === "buyer" ? "/listings" : "/listings/create")}
                className="btn-primary"
              >
                {user.role === "buyer" ? "Browse Listings" : "Create Listing"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
