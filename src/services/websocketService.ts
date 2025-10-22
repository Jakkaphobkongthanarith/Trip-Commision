interface NotificationMessage {
  id: string;
  type: "notification" | "system" | "existing_notification" | "unread_count";
  title: string;
  message: string;
  userID?: string;
  timestamp: string;
  data?: any; // เพิ่ม data field สำหรับข้อมูลเพิ่มเติม
}

interface WebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: NotificationMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  public options: WebSocketOptions; // เปลี่ยนเป็น public
  private reconnectAttempts = 0;
  private isConnected = false;
  private messageQueue: NotificationMessage[] = [];
  private listeners: ((message: NotificationMessage) => void)[] = [];

  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url;
    this.options = {
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...options,
    };
  }

  // Method สำหรับอัพเดท options
  updateOptions(newOptions: Partial<WebSocketOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions,
    };
  }

  connect(userID?: string): void {
    try {
      // เพิ่ม userID เป็น query parameter ถ้ามี
      const wsUrl = userID ? `${this.url}?userID=${userID}` : this.url;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("✅ WebSocket connected");
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // ส่งข้อความที่รอส่งในคิว (ถ้ามี)
        this.flushMessageQueue();

        if (this.options.onConnect) {
          this.options.onConnect();
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message: NotificationMessage = JSON.parse(event.data);
          console.log("📨 Received notification:", message);

          // แจ้งให้ทุก listeners
          this.listeners.forEach((listener) => listener(message));

          if (this.options.onMessage) {
            this.options.onMessage(message);
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      this.socket.onclose = (event) => {
        console.log("🔌 WebSocket disconnected:", event.code, event.reason);
        this.isConnected = false;

        if (this.options.onDisconnect) {
          this.options.onDisconnect();
        }

        // Auto-reconnect ถ้าเปิดใช้งาน
        if (
          this.options.autoReconnect &&
          this.reconnectAttempts < (this.options.maxReconnectAttempts || 5)
        ) {
          this.reconnectAttempts++;
          console.log(
            `🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
          );

          setTimeout(() => {
            this.connect(userID);
          }, this.options.reconnectInterval);
        }
      };

      this.socket.onerror = (error) => {
        console.error("❌ WebSocket error:", error);

        if (this.options.onError) {
          this.options.onError(error);
        }
      };
    } catch (error) {
      console.error("❌ Error creating WebSocket connection:", error);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, "Client disconnect");
      this.socket = null;
      this.isConnected = false;
    }
  }

  // เพิ่ม listener สำหรับรับข้อความ
  addMessageListener(listener: (message: NotificationMessage) => void): void {
    this.listeners.push(listener);
  }

  // ลบ listener
  removeMessageListener(
    listener: (message: NotificationMessage) => void
  ): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // ส่งข้อความผ่าน WebSocket (ถ้าจำเป็น)
  sendMessage(message: any): void {
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn("⚠️ WebSocket not connected, message queued");
      this.messageQueue.push(message);
    }
  }

  // ส่งข้อความที่รอในคิว
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected && this.socket) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.send(JSON.stringify(message));
      }
    }
  }

  // ตรวจสอบสถานะการเชื่อมต่อ
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  // รีเซ็ต reconnection attempts
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

// สร้าง singleton instance
const getWebSocketURL = (): string => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || "8000";

  let wsUrl: string;

  // สำหรับ development ใช้ localhost, สำหรับ production ใช้ host เดียวกัน
  if (import.meta.env.DEV) {
    wsUrl = `${protocol}//localhost:${port}/ws`;
  } else {
    wsUrl = `${protocol}//${host}:${port}/ws`;
  }

  return wsUrl;
};

// Export singleton instance
export const websocketService = new WebSocketService(getWebSocketURL(), {
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
});

export type { NotificationMessage, WebSocketOptions };
export default WebSocketService;
