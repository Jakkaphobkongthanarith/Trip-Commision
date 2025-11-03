import React, { useState } from "react";
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
import { useNotifications } from "@/contexts/NotificationContext";

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

  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  console.log(
    "🔔 NotificationPanel - Notifications from context:",
    notifications
  );
  console.log("🔔 NotificationPanel - Unread count:", unreadCount);
  console.log("🔔 NotificationPanel - WebSocket connected:", isConnected);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

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
          {!isConnected ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-red-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">เชื่อมต่อ WebSocket ไม่ได้</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const notificationData = {
                  id: notification.id,
                  title: notification.title,
                  message: notification.message,
                  category: "info" as const,
                  priority: 2 as const,
                  is_read: notification.isRead,
                  created_at: notification.createdAt,
                  action_url: undefined,
                  image_url: undefined,
                };

                const config =
                  categoryConfig[notificationData.category] ||
                  categoryConfig.info;
                const priorityStyle =
                  priorityConfig[notificationData.priority] ||
                  priorityConfig[2];
                const IconComponent = config.icon;

                return (
                  <div
                    key={notificationData.id}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                      !notificationData.is_read
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
                              !notificationData.is_read
                                ? priorityStyle.textColor
                                : "text-gray-600"
                            }`}
                          >
                            {notificationData.title}
                          </h4>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notificationData.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notificationData.id);
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
                                deleteNotification(notificationData.id);
                              }}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mt-1">
                          {notificationData.message}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(notificationData.created_at)}
                          </span>
                          {/* WebSocket Status */}
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50"
                          >
                            WebSocket
                          </Badge>
                        </div>

                        {/* Image if available */}
                        {notificationData.image_url && (
                          <img
                            src={notificationData.image_url}
                            alt=""
                            className="mt-2 w-full max-w-[200px] h-20 object-cover rounded"
                          />
                        )}

                        {/* Action URL indicator */}
                        {notificationData.action_url && (
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
