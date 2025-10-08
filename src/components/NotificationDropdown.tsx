import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // ดึงข้อมูล notifications
  const fetchNotifications = async () => {
    if (!user?.id) {
      console.log("No user ID available for notifications");
      return;
    }

    console.log("Fetching notifications for user:", user.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/user/${user.id}`
      );

      console.log("Notifications response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Notifications data:", data);
        setNotifications(data);
      } else {
        const errorText = await response.text();
        console.error("Notifications API error:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // ดึงจำนวน notifications ที่ยังไม่ได้อ่าน
  const fetchUnreadCount = async () => {
    if (!user?.id) {
      console.log("No user ID available for unread count");
      return;
    }

    console.log("Fetching unread count for user:", user.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/user/${user.id}/unread-count`
      );

      console.log("Unread count response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Unread count data:", data);
        setUnreadCount(data.unread_count);
      } else {
        const errorText = await response.text();
        console.error("Unread count API error:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // ทำเครื่องหมาย notification ว่าอ่านแล้ว
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
        }
      );
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // ทำเครื่องหมาย notifications ทั้งหมดว่าอ่านแล้ว
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/user/${user.id}/read-all`,
        {
          method: "PUT",
        }
      );
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // ฟังก์ชันทดสอบสร้าง notification
  const createTestNotification = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          title: "ทดสอบการแจ้งเตือน",
          message: "นี่คือการแจ้งเตือนทดสอบ",
          type: "test",
        }),
      });

      if (response.ok) {
        console.log("Test notification created successfully");
        fetchNotifications();
        fetchUnreadCount();
      } else {
        const errorText = await response.text();
        console.error(
          "Create test notification error:",
          response.status,
          errorText
        );
      }
    } catch (error) {
      console.error("Error creating test notification:", error);
    }
  };

  // ลบ notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== notificationId)
        );
        // ลด unreadCount ถ้า notification ที่ลบยังไม่ได้อ่าน
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

  // ฟอร์แมตวันที่
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return "เมื่อกี้";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} นาทีที่แล้ว`;
    } else if (diffHours < 24) {
      return `${diffHours} ชั่วโมงที่แล้ว`;
    } else if (diffDays < 7) {
      return `${diffDays} วันที่แล้ว`;
    } else {
      return date.toLocaleDateString("th-TH");
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      fetchUnreadCount();

      // Polling notifications ทุก 30 วินาที
      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // เมื่อเปิด popup ให้ fetch ข้อมูลใหม่
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotifications();
    }
  }, [isOpen, user?.id]);

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">การแจ้งเตือน</h3>
            <div className="flex gap-2">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={createTestNotification}
                className="text-xs"
              >
                ทดสอบ
              </Button>
            </div>
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              ไม่มีการแจ้งเตือน
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.is_read ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm leading-5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs px-2 h-6"
                        >
                          อ่าน
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification(notification.id)}
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
