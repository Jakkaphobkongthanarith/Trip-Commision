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
import { useNotifications } from "@/contexts/NotificationContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function NotificationDropdown() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

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
          message: "นี่คือการแจ้งเตือนทดสอบแบบ WebSocket",
          type: "test",
        }),
      });

      if (response.ok) {
        console.log("✅ Test notification created successfully");
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Create test notification error:",
          response.status,
          errorText
        );
      }
    } catch (error) {
      console.error("❌ Error creating test notification:", error);
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

  // 🚫 TEMPORARILY DISABLED: เมื่อเปิด popup ให้ fetch ข้อมูลใหม่ (fallback)
  // Testing WebSocket implementation - remove comments when WebSocket is confirmed working
  // useEffect(() => {
  //   if (isOpen && user?.id) {
  //     fetchNotifications();
  //   }
  // }, [isOpen, user?.id, fetchNotifications]);

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* แสดงสถานะการเชื่อมต่อ WebSocket */}
          <div
            className={`absolute -top-0.5 -left-0.5 h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
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
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">การแจ้งเตือน</h3>
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
                title={isConnected ? "เชื่อมต่อแล้ว" : "ไม่ได้เชื่อมต่อ"}
              />
            </div>
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
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      {notification.title && (
                        <p className="text-sm font-medium leading-5">
                          {notification.title}
                        </p>
                      )}
                      <p className="text-sm leading-5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
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
