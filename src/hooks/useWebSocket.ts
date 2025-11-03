import { useEffect, useRef, useState, useCallback } from "react";
import {
  websocketService,
  NotificationMessage,
} from "../services/websocketService";

interface UseWebSocketOptions {
  userID?: string;
  onMessage?: (message: NotificationMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: NotificationMessage | null;
  connect: (userID?: string) => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  reconnect: () => void;
}

export const useWebSocket = (
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NotificationMessage | null>(
    null
  );
  const optionsRef = useRef(options);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleMessage = useCallback((message: NotificationMessage) => {
    setLastMessage(message);
    if (optionsRef.current.onMessage) {
      optionsRef.current.onMessage(message);
    }
  }, []);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
    console.log("WebSocket connected via useWebSocket hook");
    if (optionsRef.current.onConnect) {
      optionsRef.current.onConnect();
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    console.log("WebSocket disconnected via useWebSocket hook");
    if (optionsRef.current.onDisconnect) {
      optionsRef.current.onDisconnect();
    }
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error("WebSocket error via useWebSocket hook:", error);
    if (optionsRef.current.onError) {
      optionsRef.current.onError(error);
    }
  }, []);

  const connect = useCallback(
    (userID?: string) => {
      try {
        websocketService.addMessageListener(handleMessage);

        websocketService.updateOptions({
          onConnect: handleConnect,
          onDisconnect: handleDisconnect,
          onError: handleError,
        });

        websocketService.connect(userID || optionsRef.current.userID);
      } catch (error) {
        console.error("Error connecting WebSocket:", error);
      }
    },
    [handleMessage, handleConnect, handleDisconnect, handleError]
  );

  const disconnect = useCallback(() => {
    try {
      websocketService.removeMessageListener(handleMessage);
      websocketService.disconnect();
      setIsConnected(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    } catch (error) {
      console.error("Error disconnecting WebSocket:", error);
    }
  }, [handleMessage]);

  const reconnect = useCallback(() => {
    disconnect();
    websocketService.resetReconnectAttempts();

    reconnectTimeoutRef.current = setTimeout(() => {
      connect(optionsRef.current.userID);
    }, 100);
  }, [connect, disconnect]);

  const sendMessage = useCallback((message: any) => {
    try {
      websocketService.sendMessage(message);
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
    }
  }, []);

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect(options.userID);
    }

    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (options.userID && isConnected) {
      reconnect();
    } else if (options.userID && !isConnected) {
      connect(options.userID);
    }
  }, [options.userID]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    reconnect,
  };
};

export default useWebSocket;
