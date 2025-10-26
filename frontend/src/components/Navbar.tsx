"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, User, LogOut, Menu, X, TrendingUp } from "lucide-react";
import { clearAuth, isAuthenticated, getStoredToken } from "@/lib/auth";
import { notificationsApi } from "@/lib/api";
import NotificationPanel from "./NotificationPanel";
import ThemeToggle from "./ThemeToggle";

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Only make API calls if we have both user and token
  const hasValidAuth = !!user && !!getStoredToken() && isAuthenticated();

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getNotifications(),
    enabled: hasValidAuth,
    refetchInterval: hasValidAuth ? 30000 : false, // Only refetch if authenticated
  });

  const unreadCount = notificationsData?.unread_count ?? 0;

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (!user) return null;

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Listings", href: "/listings" },
    { name: "Contracts", href: "/contracts" },
  ];

  return (
    <>
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Oilseed Platform
                  </h1>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium">{user.role}</p>
                  </div>
                  
                  <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="hidden sm:flex items-center space-x-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="sm:hidden">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  {showMobileMenu ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {showMobileMenu && (
            <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 py-2">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href);
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {item.name}
                  </button>
                ))}
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
