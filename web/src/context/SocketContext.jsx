import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_SERVER_URL = 'http://localhost:3000';

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [lastInventoryEvent, setLastInventoryEvent] = useState(null);

  useEffect(() => {
    // Connect directly to the Node API server (avoiding fragile Vite ws proxy)
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      timeout: 5000
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (token) {
        newSocket.emit('authenticate', token);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    newSocket.on('emergency_alert', (data) => {
      setLiveAlerts((prev) => [data, ...prev.slice(0, 9)]);
    });

    newSocket.on('emergency_alert_broadcast', (data) => {
      setLiveAlerts((prev) => [data, ...prev.slice(0, 9)]);
    });

    newSocket.on('inventory_update', (data) => {
      setLastInventoryEvent(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (socket && isConnected && token) {
      socket.emit('authenticate', token);
    }
  }, [socket, isConnected, token, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        liveAlerts,
        lastInventoryEvent,
        clearAlerts: () => setLiveAlerts([])
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext) || { isConnected: false, liveAlerts: [] };
}
