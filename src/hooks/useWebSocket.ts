import { useEffect, useRef, useState, useCallback } from 'react';
import { websocketService, NotificationMessage } from '../services/websocketService';

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

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NotificationMessage | null>(null);
  const optionsRef = useRef(options);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // WebSocket message handler
  const handleMessage = useCallback((message: NotificationMessage) => {
    setLastMessage(message);
    if (optionsRef.current.onMessage) {
      optionsRef.current.onMessage(message);
    }
  }, []);

  // WebSocket connection handler
  const handleConnect = useCallback(() => {
    setIsConnected(true);
    console.log('🔗 WebSocket connected via useWebSocket hook');
    if (optionsRef.current.onConnect) {
      optionsRef.current.onConnect();
    }
  }, []);

  // WebSocket disconnection handler
  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    console.log('🔌 WebSocket disconnected via useWebSocket hook');
    if (optionsRef.current.onDisconnect) {
      optionsRef.current.onDisconnect();
    }
  }, []);

  // WebSocket error handler
  const handleError = useCallback((error: Event) => {
    console.error('❌ WebSocket error via useWebSocket hook:', error);
    if (optionsRef.current.onError) {
      optionsRef.current.onError(error);
    }
  }, []);

  // Connect function
  const connect = useCallback((userID?: string) => {
    try {
      // Add event listeners
      websocketService.addMessageListener(handleMessage);
      
      // Update service options using the new method
      websocketService.updateOptions({
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onError: handleError,
      });

      // Connect with userID
      websocketService.connect(userID || optionsRef.current.userID);
    } catch (error) {
      console.error('❌ Error connecting WebSocket:', error);
    }
  }, [handleMessage, handleConnect, handleDisconnect, handleError]);

  // Disconnect function
  const disconnect = useCallback(() => {
    try {
      websocketService.removeMessageListener(handleMessage);
      websocketService.disconnect();
      setIsConnected(false);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    } catch (error) {
      console.error('❌ Error disconnecting WebSocket:', error);
    }
  }, [handleMessage]);

  // Reconnect function
  const reconnect = useCallback(() => {
    disconnect();
    websocketService.resetReconnectAttempts();
    
    // Delay reconnection slightly to ensure clean disconnect
    reconnectTimeoutRef.current = setTimeout(() => {
      connect(optionsRef.current.userID);
    }, 100);
  }, [connect, disconnect]);

  // Send message function
  const sendMessage = useCallback((message: any) => {
    try {
      websocketService.sendMessage(message);
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect(options.userID);
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array for mount/unmount only

  // Update connection when userID changes
  useEffect(() => {
    if (options.userID && isConnected) {
      // Reconnect with new userID
      reconnect();
    }
  }, [options.userID]); // Only when userID changes

  // Cleanup timeout on unmount
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