"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ArrowLeft, MapPin, Calendar, User, Package, Droplets, FileText } from "lucide-react";
import { isAuthenticated, getStoredUser } from "@/lib/auth";
import { listingsApi, contractsApi } from "@/lib/api";
import { ContractForm } from "@/lib/types";

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(getStoredUser());
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [error, setError] = useState("");

  const listingId = Number(params.id);

  useEffect(() => {
    if (!isAuthenticated()) {
      console.log("ohh no5")
      // router.push("/login");
      return;
    }
    setUser(getStoredUser());
  }, [router]);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => listingsApi.getListing(listingId),
    enabled: !!user && !!listingId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContractForm>();

  const createOfferMutation = useMutation({
    mutationFn: contractsApi.createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setShowOfferModal(false);
      reset();
      router.push("/contracts");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to create offer. Please try again.");
    },
  });

  const onSubmitOffer = (data: ContractForm) => {
    setError("");
    createOfferMutation.mutate({
      ...data,
      listing_id: listingId,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
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
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing not found</h2>
          <p className="text-gray-600 mb-4">The listing you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push("/listings")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Browse Listings
          </button>
        </div>
      </div>
    );
  }

  const canMakeOffer = user.role === "buyer" && listing.seller_id !== user.id;
  const isOwner = listing.seller_id === user.id;

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 capitalize">
                {listing.commodity}
                {listing.variety && (
                  <span className="text-xl text-gray-500 ml-2">({listing.variety})</span>
                )}
              </h1>
              <p className="text-gray-600">Listed by {listing.seller_alias}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            {listing.photos && listing.photos.length > 0 && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {listing.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`${listing.commodity} ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Quantity Available</p>
                      <p className="font-medium">{listing.qty_kg.toLocaleString()} kg</p>
                    </div>
                  </div>
                  
                  {listing.moisture_pct && (
                    <div className="flex items-center">
                      <Droplets className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Moisture Content</p>
                        <p className="font-medium">{listing.moisture_pct}%</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {listing.location && (
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium">{listing.location}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Listed On</p>
                      <p className="font-medium">
                        {new Date(listing.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Notes */}
            {listing.quality_notes && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quality Notes</h2>
                <p className="text-gray-700 leading-relaxed">{listing.quality_notes}</p>
              </div>
            )}

            {/* Offers Summary */}
            {listing.offers_summary && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Offers Summary</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {listing.offers_summary.total_offers}
                    </p>
                    <p className="text-sm text-gray-500">Total Offers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {listing.offers_summary.active_offers}
                    </p>
                    <p className="text-sm text-gray-500">Active Offers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Last Offer Status</p>
                    {listing.offers_summary.last_offer_status && (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {listing.offers_summary.last_offer_status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  ₹{listing.price_per_kg}/kg
                </p>
                <p className="text-sm text-gray-500 mt-1">Listed Price</p>
              </div>
              
              <div className="mt-6 space-y-3">
                {canMakeOffer && (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium"
                  >
                    Make Offer
                  </button>
                )}
                
                {isOwner && (
                  <button
                    onClick={() => router.push("/contracts")}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-md font-medium"
                  >
                    View Offers
                  </button>
                )}
                
                <button
                  onClick={() => router.push("/listings")}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-md font-medium hover:bg-gray-50"
                >
                  Browse More Listings
                </button>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>
              <div className="flex items-center mb-3">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <span className="font-medium">{listing.seller_alias}</span>
              </div>
              <p className="text-sm text-gray-600">
                Verified farmer with quality commodities
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Make Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Make an Offer</h3>
            
            <form onSubmit={handleSubmit(onSubmitOffer)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (kg) *
                </label>
                <input
                  {...register("qty", {
                    required: "Quantity is required",
                    min: { value: 1, message: "Quantity must be greater than 0" },
                    max: { value: listing.qty_kg, message: `Maximum ${listing.qty_kg} kg available` },
                  })}
                  type="number"
                  step="0.01"
                  placeholder={`Max: ${listing.qty_kg} kg`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.qty && (
                  <p className="mt-1 text-sm text-red-600">{errors.qty.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Price (₹/kg) *
                </label>
                <input
                  {...register("offer_price_per_kg", {
                    required: "Offer price is required",
                    min: { value: 0.01, message: "Price must be greater than 0" },
                  })}
                  type="number"
                  step="0.01"
                  placeholder={`Listed at ₹${listing.price_per_kg}/kg`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.offer_price_per_kg && (
                  <p className="mt-1 text-sm text-red-600">{errors.offer_price_per_kg.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Expires On
                </label>
                <input
                  {...register("expiry_date")}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOfferModal(false);
                    setError("");
                    reset();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                >
                  {createOfferMutation.isPending ? "Creating..." : "Submit Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
