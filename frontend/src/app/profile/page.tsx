"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { User, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

interface ProfileForm {
  name: string;
  email: string;
  kyc_document?: FileList;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isChecking } = useAuth("/login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ProfileForm>();

  useEffect(() => {
    if (user) {
      setValue("name", user.name);
      setValue("email", user.email);
    }
  }, [user, setValue]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        setError("Please upload a PDF, JPEG, or PNG file");
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      
      setSelectedFile(file);
      setError("");
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // In a real implementation, this would call an API to update profile
      // For now, we'll just simulate the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess("Profile updated successfully!");
      
      // Update local storage with new data
      if (user) {
        const updatedUser = { ...user, name: data.name, email: data.email };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        // Note: useAuth hook will automatically pick up the updated user data
      }
    } catch (err: any) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getKycStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (authLoading || isChecking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your account and KYC verification</p>
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

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* KYC Status */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">KYC Verification Status</h2>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${getKycStatusColor(user.kyc_status)}`}>
                  {getKycStatusIcon(user.kyc_status)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {user.kyc_status}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.kyc_status === "approved" && "Your identity has been verified"}
                    {user.kyc_status === "pending" && "Your documents are under review"}
                    {user.kyc_status === "rejected" && "Please resubmit your documents"}
                    {user.kyc_status === "not_submitted" && "Please upload your KYC documents"}
                  </p>
                </div>
              </div>
              
              {user.kyc_document_url && (
                <a
                  href={user.kyc_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Document
                </a>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    {...register("name", { required: "Name is required" })}
                    type="text"
                    className="input"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    type="email"
                    className="input"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value={user.role}
                    disabled
                    className="input bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 capitalize"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Member Since
                  </label>
                  <input
                    type="text"
                    value={new Date(user.created_at).toLocaleDateString()}
                    disabled
                    className="input bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>

              {/* KYC Document Upload */}
              {user.kyc_status !== "approved" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    KYC Document Upload
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Upload a government-issued ID (Aadhaar, PAN, Passport, etc.) - PDF, JPEG, or PNG format, max 5MB
                  </p>
                  
                  <div className="flex items-center space-x-4">
                    <label className="cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    
                    {selectedFile && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedFile.name}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>

          {/* Account Statistics */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {user.role === "farmer" ? "Listings Created" : "Offers Made"}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Contracts Completed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">₹0</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Transaction Value</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
