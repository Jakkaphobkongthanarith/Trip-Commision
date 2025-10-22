import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import { NotificationMessage } from "../services/websocketService";
import { useToast } from "../hooks/use-toast";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // WebSocket connection
  const { isConnected, lastMessage } = useWebSocket({
    userID: user?.id,
    onMessage: (message: NotificationMessage) => {
      console.log("📨 Received real-time notification:", message);
      console.log("📨 Message type:", message.type);
      console.log("📨 Message data:", message.data);

      // Handle different message types
      if (message.type === "existing_notification") {
        console.log("📋 Processing existing notification:", message);
        // ข้อมูล notifications เก่าจาก WebSocket
        const existingNotification: NotificationData = {
          id: message.id,
          title: message.title,
          message: message.message,
          type: "notification",
          isRead: message.data?.isRead || false, // ถ้ามีข้อมูล isRead จาก data
          createdAt: message.timestamp,
        };

        console.log(
          "📋 Adding existing notification to state:",
          existingNotification
        );

        setNotifications((prev) => {
          // ตรวจสอบไม่ให้ duplicate
          if (!prev.find((n) => n.id === existingNotification.id)) {
            const newList = [...prev, existingNotification];
            console.log("📋 Updated notifications list:", newList);
            return newList;
          }
          console.log("📋 Notification already exists, skipping");
          return prev;
        });
      } else if (message.type === "unread_count") {
        console.log("📊 Processing unread count:", message.data?.count);
        // อัพเดท unread count
        setUnreadCount(message.data?.count || 0);
      } else if (message.type === "notification") {
        console.log("🔔 Processing new real-time notification:", message);
        // Notification ใหม่แบบ real-time
        toast({
          title: message.title,
          description: message.message,
          duration: 5000,
        });

        // เพิ่ม notification ใหม่ลงใน list
        if (message.id) {
          const newNotification: NotificationData = {
            id: message.id,
            title: message.title,
            message: message.message,
            type: message.type,
            isRead: false,
            createdAt: message.timestamp,
          };

          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      }
    },
    onConnect: () => {
      console.log("🔗 Notification WebSocket connected");
    },
    onDisconnect: () => {
      console.log("🔌 Notification WebSocket disconnected");
    },
    autoConnect: !!user?.id, // เชื่อมต่ออัตโนมัติเมื่อมี user
  });

  // ทำเครื่องหมาย notification ว่าอ่านแล้ว
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
        }/api/notifications/${id}/read`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
    }
  };

  // ทำเครื่องหมาย notifications ทั้งหมดว่าอ่านแล้ว
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
        }/api/notifications/user/${user.id}/read-all`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
    }
  };

  // ลบ notification
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
        }/api/notifications/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
        // ลด unread count ถ้า notification ที่ลบยังไม่ได้อ่าน
        const deletedNotif = notifications.find((n) => n.id === id);
        if (deletedNotif && !deletedNotif.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
    }
  };

  // รีเซ็ต state เมื่อ user เปลี่ยนหรือ logout
  useEffect(() => {
    if (!user?.id) {
      // รีเซ็ต state เมื่อ logout
      setNotifications([]);
      setUnreadCount(0);
    }
    // ไม่ต้อง fetch จาก API เพราะใช้ WebSocket แล้ว
  }, [user?.id]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
