"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, MapPin, Calendar, User } from "lucide-react";
import { isAuthenticated, getStoredUser } from "@/lib/auth";
import { listingsApi } from "@/lib/api";
import { Listing } from "@/lib/types";
import Navbar from "@/components/Navbar";

export default function ListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(getStoredUser());
  const [filters, setFilters] = useState({
    commodity: "",
    min_qty: "",
    max_price: "",
    location: "",
    page: 1,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setUser(getStoredUser());
  }, [router]);

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ["listings", filters],
    queryFn: () => listingsApi.getListings({
      commodity: filters.commodity || undefined,
      min_qty: filters.min_qty ? Number(filters.min_qty) : undefined,
      max_price: filters.max_price ? Number(filters.max_price) : undefined,
      location: filters.location || undefined,
      page: filters.page,
      limit: 12,
    }),
    enabled: !!user,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleMakeOffer = (listingId: number) => {
    router.push(`/listings/${listingId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Browse Listings</h1>
              <p className="text-gray-600 dark:text-gray-400">Find commodities to purchase</p>
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
        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Commodity
              </label>
              <select
                value={filters.commodity}
                onChange={(e) => handleFilterChange("commodity", e.target.value)}
                className="input"
              >
                <option value="">All Commodities</option>
                <option value="soymeal">Soymeal</option>
                <option value="groundnut">Groundnut</option>
                <option value="mustard">Mustard</option>
                <option value="sunflower">Sunflower</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Quantity (kg)
              </label>
              <input
                type="number"
                value={filters.min_qty}
                onChange={(e) => handleFilterChange("min_qty", e.target.value)}
                placeholder="e.g. 1000"
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Price (₹/kg)
              </label>
              <input
                type="number"
                value={filters.max_price}
                onChange={(e) => handleFilterChange("max_price", e.target.value)}
                placeholder="e.g. 50"
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
                placeholder="e.g. Punjab"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : listingsData?.listings?.length ? (
          <>
            {/* Results Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {listingsData.meta?.total || listingsData.listings.length} Listings Found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {listingsData.listings.length} results
                  {listingsData.meta?.pages > 1 && ` (Page ${filters.page} of ${listingsData.meta.pages})`}
                </p>
              </div>
              {user.role === "farmer" && (
                <button
                  onClick={() => router.push("/listings/create")}
                  className="btn-primary"
                >
                  Create Listing
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listingsData.listings.map((listing: Listing) => (
                <div key={listing.id} className="card-hover overflow-hidden group">
                  {/* Photo placeholder */}
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center relative overflow-hidden">
                    {listing.photos?.length ? (
                      <img
                        src={listing.photos[0]}
                        alt={listing.commodity}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-gray-400 dark:text-gray-500 text-center">
                        <Search className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm">No photo available</p>
                      </div>
                    )}
                    {/* Commodity badge */}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-900 dark:text-white capitalize">
                        {listing.commodity}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                          {listing.commodity}
                        </h3>
                        {listing.variety && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {listing.variety} variety
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          ₹{listing.price_per_kg}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 block">
                          per kg
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">{listing.seller_alias}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Search className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                          <span>{listing.qty_kg.toLocaleString()} kg</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                          <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {listing.location && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                          <span>{listing.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {listing.quality_notes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          {listing.quality_notes}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex space-x-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => router.push(`/listings/${listing.id}`)}
                        className="btn-secondary flex-1 text-sm py-2"
                      >
                        View Details
                      </button>
                      
                      {user.role === "buyer" && (
                        <button
                          onClick={() => handleMakeOffer(listing.id)}
                          className="btn-primary flex-1 text-sm py-2"
                        >
                          Make Offer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {listingsData.meta && listingsData.meta.pages > 1 && (
              <div className="flex justify-center items-center space-x-3">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={!listingsData.meta.has_prev}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
                    Page {filters.page} of {listingsData.meta.pages}
                  </span>
                </div>
                
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={!listingsData.meta.has_next}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-12">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
              <Search className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No listings found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try adjusting your filters or check back later for new listings.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setFilters({ commodity: "", min_qty: "", max_price: "", location: "", page: 1 })}
                className="btn-secondary"
              >
                Clear Filters
              </button>
              {user.role === "farmer" && (
                <button
                  onClick={() => router.push("/listings/create")}
                  className="btn-primary"
                >
                  Create Listing
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
