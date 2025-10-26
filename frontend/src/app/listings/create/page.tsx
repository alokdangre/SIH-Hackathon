"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Upload, X, Plus } from "lucide-react";
import { isAuthenticated, getStoredUser } from "@/lib/auth";
import { listingsApi } from "@/lib/api";
import { ListingForm } from "@/lib/types";

export default function CreateListingPage() {
  const router = useRouter();
  const [user, setUser] = useState(getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      console.log("ohh no6")
      // router.push("/login");
      return;
    }
    const currentUser = getStoredUser();
    if (currentUser?.role !== "farmer") {
      router.push("/dashboard");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ListingForm>();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedFiles.length > 3) {
      setError("Maximum 3 photos allowed");
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    // Create preview URLs
    const newUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newUrls]);
    setError("");
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    // Revoke the removed URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const onSubmit = async (data: ListingForm) => {
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("commodity", data.commodity);
      if (data.variety) formData.append("variety", data.variety);
      formData.append("qty_kg", data.qty_kg.toString());
      formData.append("price_per_kg", data.price_per_kg.toString());
      if (data.moisture_pct) formData.append("moisture_pct", data.moisture_pct.toString());
      if (data.quality_notes) formData.append("quality_notes", data.quality_notes);
      if (data.location) formData.append("location", data.location);

      // Append photos
      selectedFiles.forEach((file) => {
        formData.append("photos", file);
      });

      await listingsApi.createListing(formData);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create listing. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Listing</h1>
              <p className="text-gray-600">Upload photos and enter quantity (kg)</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Photos Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (Optional, max 3)
              </label>
              
              {/* Preview Grid */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {/* Add Photo Button */}
                {selectedFiles.length < 3 && (
                  <label className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400">
                    <div className="text-center">
                      <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-500">Add Photo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commodity *
                </label>
                <select
                  {...register("commodity", { required: "Commodity is required" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select commodity</option>
                  <option value="soymeal">Soymeal</option>
                  <option value="groundnut">Groundnut</option>
                  <option value="mustard">Mustard</option>
                  <option value="sunflower">Sunflower</option>
                </select>
                {errors.commodity && (
                  <p className="mt-1 text-sm text-red-600">{errors.commodity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variety
                </label>
                <input
                  {...register("variety")}
                  type="text"
                  placeholder="e.g. Premium, Bold"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (kg) *
                </label>
                <input
                  {...register("qty_kg", {
                    required: "Quantity is required",
                    min: { value: 1, message: "Quantity must be greater than 0" },
                  })}
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.qty_kg && (
                  <p className="mt-1 text-sm text-red-600">{errors.qty_kg.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per kg (₹) *
                </label>
                <input
                  {...register("price_per_kg", {
                    required: "Price is required",
                    min: { value: 0.01, message: "Price must be greater than 0" },
                  })}
                  type="number"
                  step="0.01"
                  placeholder="e.g. 45.50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.price_per_kg && (
                  <p className="mt-1 text-sm text-red-600">{errors.price_per_kg.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moisture %
                </label>
                <input
                  {...register("moisture_pct", {
                    min: { value: 0, message: "Moisture cannot be negative" },
                    max: { value: 100, message: "Moisture cannot exceed 100%" },
                  })}
                  type="number"
                  step="0.1"
                  placeholder="e.g. 12.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.moisture_pct && (
                  <p className="mt-1 text-sm text-red-600">{errors.moisture_pct.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  {...register("location")}
                  type="text"
                  placeholder="e.g. Punjab, Gujarat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality Notes
              </label>
              <textarea
                {...register("quality_notes")}
                rows={3}
                placeholder="Describe the quality, grade, and any other relevant details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Create Listing"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
