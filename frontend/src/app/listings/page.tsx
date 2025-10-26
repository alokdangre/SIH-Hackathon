"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, MapPin, Calendar, User } from "lucide-react";
import { isAuthenticated, getStoredUser } from "@/lib/auth";
import { listingsApi } from "@/lib/api";
import { Listing } from "@/lib/types";

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
      console.log("ohh no4")
      // router.push("/login");
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Browse Listings</h1>
              <p className="text-gray-600">Find commodities to purchase</p>
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
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commodity
              </label>
              <select
                value={filters.commodity}
                onChange={(e) => handleFilterChange("commodity", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Commodities</option>
                <option value="soymeal">Soymeal</option>
                <option value="groundnut">Groundnut</option>
                <option value="mustard">Mustard</option>
                <option value="sunflower">Sunflower</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Quantity (kg)
              </label>
              <input
                type="number"
                value={filters.min_qty}
                onChange={(e) => handleFilterChange("min_qty", e.target.value)}
                placeholder="e.g. 1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price (₹/kg)
              </label>
              <input
                type="number"
                value={filters.max_price}
                onChange={(e) => handleFilterChange("max_price", e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
                placeholder="e.g. Punjab"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : listingsData?.listings?.length ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listingsData.listings.map((listing: Listing) => (
                <div key={listing.id} className="bg-white shadow rounded-lg overflow-hidden">
                  {/* Photo placeholder */}
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    {listing.photos?.length ? (
                      <img
                        src={listing.photos[0]}
                        alt={listing.commodity}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        <Search className="h-12 w-12 mx-auto mb-2" />
                        <p>No photo available</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {listing.commodity}
                        {listing.variety && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({listing.variety})
                          </span>
                        )}
                      </h3>
                      <span className="text-lg font-bold text-green-600">
                        ₹{listing.price_per_kg}/kg
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        {listing.seller_alias}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Search className="h-4 w-4 mr-2" />
                        {listing.qty_kg.toLocaleString()} kg available
                      </div>
                      
                      {listing.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          {listing.location}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(listing.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {listing.quality_notes && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {listing.quality_notes}
                      </p>
                    )}
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/listings/${listing.id}`)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        View Details
                      </button>
                      
                      {user.role === "buyer" && (
                        <button
                          onClick={() => handleMakeOffer(listing.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
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
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={!listingsData.meta.has_prev}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {filters.page} of {listingsData.meta.pages}
                </span>
                
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={!listingsData.meta.has_next}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No listings found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or check back later for new listings.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
