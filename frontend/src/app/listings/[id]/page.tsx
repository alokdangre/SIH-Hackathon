"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ArrowLeft, MapPin, Calendar, User, Package, Droplets, FileText } from "lucide-react";
import { isAuthenticated, getStoredUser } from "@/lib/auth";
import { listingsApi, contractsApi } from "@/lib/api";
import { ContractForm } from "@/lib/types";
import Navbar from "@/components/Navbar";

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                {listing.commodity}
                {listing.variety && (
                  <span className="text-xl text-gray-500 dark:text-gray-400 ml-2">({listing.variety})</span>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Listed by {listing.seller_alias}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            <div className="card overflow-hidden">
              {listing.photos && listing.photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listing.photos.map((photo, index) => (
                    <div key={index} className="relative group h-64">
                      <img
                        src={photo}
                        alt={`${listing.commodity} ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <FileText className="h-12 w-12 mb-3" />
                  <p className="text-sm">No photos uploaded for this listing.</p>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Quantity Available</p>
                      <p className="font-medium text-gray-900 dark:text-white">{listing.qty_kg.toLocaleString()} kg</p>
                    </div>
                  </div>
                  
                  {listing.moisture_pct !== null && listing.moisture_pct !== undefined && (
                    <div className="flex items-center">
                      <Droplets className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Moisture Content</p>
                        <p className="font-medium text-gray-900 dark:text-white">{listing.moisture_pct}%</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {listing.location && (
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                        <p className="font-medium text-gray-900 dark:text-white">{listing.location}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Listed On</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(listing.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Notes */}
            {listing.quality_notes && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quality Notes</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{listing.quality_notes}</p>
              </div>
            )}

            {/* Offers Summary */}
            {listing.offers_summary && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Offers Summary</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {listing.offers_summary.total_offers}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Offers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {listing.offers_summary.active_offers}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Offers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Offer Status</p>
                    {listing.offers_summary.last_offer_status && (
                      <span className="badge badge-muted capitalize">
                        {listing.offers_summary.last_offer_status.replace("_", " ")}
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
            <div className="card">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  ₹{listing.price_per_kg}/kg
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Listed Price</p>
              </div>
              
              <div className="mt-6 space-y-3">
                {canMakeOffer && (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="btn-primary w-full"
                  >
                    Make Offer
                  </button>
                )}
                
                {isOwner && (
                  <button
                    onClick={() => router.push("/contracts")}
                    className="btn-secondary w-full"
                  >
                    View Offers
                  </button>
                )}
                
                <button
                  onClick={() => router.push("/listings")}
                  className="btn-tertiary w-full"
                >
                  Browse More Listings
                </button>
              </div>
            </div>

            {/* Seller Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Seller Information</h3>
              <div className="flex items-center mb-3">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                <span className="font-medium text-gray-900 dark:text-white">{listing.seller_alias}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verified farmer with quality commodities
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Make Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Make an Offer</h3>
            
            <form onSubmit={handleSubmit(onSubmitOffer)} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="input"
                />
                {errors.qty && (
                  <p className="mt-1 text-sm text-red-600">{errors.qty.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="input"
                />
                {errors.offer_price_per_kg && (
                  <p className="mt-1 text-sm text-red-600">{errors.offer_price_per_kg.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Offer Expires On
                </label>
                <input
                  {...register("expiry_date")}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="input"
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
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
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
