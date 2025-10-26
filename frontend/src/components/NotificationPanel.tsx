"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { Notification } from "@/lib/types";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const queryClient = useQueryClient();
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getNotifications(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedNotifications([]);
    },
  });

  const handleMarkAsRead = (notificationIds: number[]) => {
    markAsReadMutation.mutate(notificationIds);
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = notificationsData?.notifications
      ?.filter((n: Notification) => !n.read)
      .map((n: Notification) => n.id) || [];
    
    if (unreadIds.length > 0) {
      handleMarkAsRead(unreadIds);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "offer-created":
        return "💰";
      case "offer-accepted":
        return "✅";
      case "contract-completed":
        return "🎉";
      case "dispute-raised":
        return "⚠️";
      default:
        return "📢";
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    const { type, payload } = notification;
    
    switch (type) {
      case "offer-created":
        return `New offer received for listing #${payload.listing_id}`;
      case "offer-accepted":
        return `Your offer for contract #${payload.contract_id} was accepted`;
      case "contract-completed":
        return `Contract #${payload.contract_id} has been completed`;
      case "dispute-raised":
        return `Dispute raised for contract #${payload.contract_id}`;
      default:
        return "You have a new notification";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              {(notificationsData?.unread_count ?? 0) > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {notificationsData?.unread_count}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Actions */}
          {(notificationsData?.unread_count ?? 0) > 0 && (
            <div className="border-b border-gray-200 px-6 py-3">
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAsReadMutation.isPending}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark all as read</span>
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (notificationsData?.notifications?.length ?? 0) > 0 ? (
              <div className="divide-y divide-gray-200">
                {notificationsData?.notifications?.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-gray-50 ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${
                          !notification.read ? "font-medium text-gray-900" : "text-gray-700"
                        }`}>
                          {getNotificationMessage(notification)}
                        </p>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                        
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead([notification.id])}
                            disabled={markAsReadMutation.isPending}
                            className="mt-2 flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            <span>Mark as read</span>
                          </button>
                        )}
                      </div>
                      
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Bell className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No notifications
                </h3>
                <p className="text-gray-500">
                  You're all caught up! Check back later for updates.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
