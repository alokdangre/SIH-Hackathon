"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, User, LogOut, Menu, X, Sun, Moon } from "lucide-react";
import { clearAuth, isAuthenticated, getStoredToken } from "@/lib/auth";
import { notificationsApi } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import NotificationPanel from "./NotificationPanel";

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Oilseed Platform
                </h1>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </button>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                  </div>
                  
                  <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="hidden sm:flex items-center space-x-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
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
