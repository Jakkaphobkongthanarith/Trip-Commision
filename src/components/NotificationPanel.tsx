import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  X,
  Check,
  AlertCircle,
  Info,
  Gift,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  category:
    | "booking"
    | "payment"
    | "discount"
    | "promotion"
    | "commission"
    | "system"
    | "info";
  priority: 1 | 2 | 3; // 1=high, 2=medium, 3=low
  action_url?: string;
  image_url?: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
}

// Category icons และ colors
const categoryConfig = {
  booking: { icon: Calendar, color: "bg-blue-500", label: "การจอง" },
  payment: { icon: DollarSign, color: "bg-green-500", label: "การชำระเงิน" },
  discount: { icon: Gift, color: "bg-purple-500", label: "ส่วนลด" },
  promotion: { icon: Gift, color: "bg-pink-500", label: "โปรโมชั่น" },
  commission: { icon: DollarSign, color: "bg-yellow-500", label: "คอมมิชชั่น" },
  system: { icon: AlertCircle, color: "bg-red-500", label: "ระบบ" },
  info: { icon: Info, color: "bg-gray-500", label: "ข้อมูล" },
};

const priorityConfig = {
  1: { color: "bg-red-100 border-red-500", textColor: "text-red-800" },
  2: { color: "bg-yellow-100 border-yellow-500", textColor: "text-yellow-800" },
  3: { color: "bg-gray-100 border-gray-300", textColor: "text-gray-600" },
};

export function NotificationPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    // Get user ID from AuthContext
    const userId = user?.id;

    console.log("🔔 NotificationPanel - Fetching for user:", userId);
    console.log("🔔 User object:", user);

    if (!userId) {
      console.warn("❌ No user ID found in NotificationPanel");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `http://localhost:8000/api/notifications/user/${userId}`
      );

      console.log("🔔 Notification API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🔔 Notifications fetched:", data);

        setNotifications(data.notifications || data || []); // Try both formats

        // Count unread notifications
        const notificationList = data.notifications || data || [];
        const unread = notificationList.filter(
          (n: Notification) => !n.is_read
        ).length;
        setUnreadCount(unread);

        console.log("🔔 Unread count:", unread);
      } else {
        const errorData = await response.text();
        console.error("❌ Notification fetch failed:", errorData);
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/notifications/user/${user.id}/read-all`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/notifications/${notificationId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        // Update unread count if deleted notification was unread
        const deletedNotification = notifications.find(
          (n) => n.id === notificationId
        );
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false); // ปิด notification panel
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "เมื่อกี้นี้";
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;

    return date.toLocaleDateString("th-TH");
  };

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      console.log(
        "🔔 NotificationPanel useEffect triggered for user:",
        user.id
      );
      fetchNotifications();
    }
  }, [user?.id]); // Only watch user.id, not the entire user object

  // Only fetch when panel opens (not on periodic interval)
  useEffect(() => {
    if (isOpen) {
      console.log("🔔 Panel opened, fetching fresh notifications");
      fetchNotifications();
    }
  }, [isOpen]);

  // 🚫 TEMPORARILY DISABLED: Listen for notification creation events
  // Testing WebSocket implementation - remove comments when WebSocket is confirmed working
  // useEffect(() => {
  //   const handleNotificationCreated = () => {
  //     console.log(
  //       "🔔 Notification created event received, fetching fresh data"
  //     );
  //     fetchNotifications();
  //   };

  //   window.addEventListener("notificationCreated", handleNotificationCreated);
  //   return () =>
  //     window.removeEventListener(
  //       "notificationCreated",
  //       handleNotificationCreated
  //     );
  // }, []);

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>การแจ้งเตือน</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                อ่านทั้งหมด
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>การแจ้งเตือนล่าสุดของคุณ</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const config =
                  categoryConfig[notification.category] || categoryConfig.info;
                const priorityStyle =
                  priorityConfig[notification.priority] || priorityConfig[2];
                const IconComponent = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                      !notification.is_read
                        ? priorityStyle.color
                        : "bg-gray-50 border-gray-300"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div
                        className={`p-2 rounded-full ${config.color} text-white flex-shrink-0`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`font-medium ${
                              !notification.is_read
                                ? priorityStyle.textColor
                                : "text-gray-600"
                            }`}
                          >
                            {notification.title}
                          </h4>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                        </div>

                        {/* Image if available */}
                        {notification.image_url && (
                          <img
                            src={notification.image_url}
                            alt=""
                            className="mt-2 w-full max-w-[200px] h-20 object-cover rounded"
                          />
                        )}

                        {/* Action URL indicator */}
                        {notification.action_url && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              คลิกเพื่อดูรายละเอียด
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
