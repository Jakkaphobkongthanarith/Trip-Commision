import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { NotificationMessage } from '../services/websocketService';
import { useToast } from '../hooks/use-toast';

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
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // WebSocket connection
  const { isConnected, lastMessage } = useWebSocket({
    userID: user?.id,
    onMessage: (message: NotificationMessage) => {
      console.log('📨 Received real-time notification:', message);
      
      // แสดง toast notification
      if (message.type === 'notification') {
        toast({
          title: message.title,
          description: message.message,
          duration: 5000,
        });
      }
      
      // เพิ่ม notification ใหม่ลงใน list (ถ้าเป็น notification ปกติ)
      if (message.type === 'notification' && message.id) {
        const newNotification: NotificationData = {
          id: message.id,
          title: message.title,
          message: message.message,
          type: message.type,
          isRead: false,
          createdAt: message.timestamp,
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    },
    onConnect: () => {
      console.log('🔗 Notification WebSocket connected');
    },
    onDisconnect: () => {
      console.log('🔌 Notification WebSocket disconnected');
    },
    autoConnect: !!user?.id, // เชื่อมต่ออัตโนมัติเมื่อมี user
  });

  // ดึงข้อมูล notifications จาก API
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications/user/${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
      } else {
        console.error('❌ Error fetching notifications:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    }
  };

  // ดึงจำนวน notifications ที่ยังไม่ได้อ่าน
  const fetchUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications/user/${user.id}/unread-count`);
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
    }
  };

  // ทำเครื่องหมาย notification ว่าอ่านแล้ว
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications/${id}/read`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => 
          notif.id === id ? { ...notif, isRead: true } : notif
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // ทำเครื่องหมาย notifications ทั้งหมดว่าอ่านแล้ว
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications/user/${user.id}/read-all`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  };

  // ลบ notification
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        // ลด unread count ถ้า notification ที่ลบยังไม่ได้อ่าน
        const deletedNotif = notifications.find(n => n.id === id);
        if (deletedNotif && !deletedNotif.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
    }
  };

  // 🚫 TEMPORARILY DISABLED: โหลดข้อมูลเมื่อ user เปลี่ยน
  // Testing WebSocket implementation - remove comments when WebSocket is confirmed working
  useEffect(() => {
    if (user?.id) {
      // fetchNotifications(); // Disabled for WebSocket testing
      // fetchUnreadCount(); // Disabled for WebSocket testing
    } else {
      // รีเซ็ต state เมื่อ logout
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    fetchUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;