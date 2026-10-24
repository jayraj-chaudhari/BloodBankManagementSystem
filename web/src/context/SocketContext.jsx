import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [lastInventoryEvent, setLastInventoryEvent] = useState(null);

  useEffect(() => {
    // Connect to backend websocket server
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true
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

  // Re-authenticate when user or token updates
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
