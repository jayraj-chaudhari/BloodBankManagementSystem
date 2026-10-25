import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [lastInventoryEvent, setLastInventoryEvent] = useState(null);

  useEffect(() => {
    // Connect directly to backend port with automatic reconnection & transports
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true
    });

    s.on('connect', () => {
      setIsConnected(true);
      // Join role room if user is authenticated
      if (user?.role) {
        s.emit('join', `role:${user.role}`);
        if (user.donor_id) {
          s.emit('join', `donor:${user.donor_id}`);
        }
        if (user.hospital_id) {
          s.emit('join', `hospital:${user.hospital_id}`);
        }
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for live emergency alerts
    s.on('emergency_alert', (data) => {
      setLiveAlerts((prev) => [data, ...prev]);
      toast.warning(
        `Critical Need: ${data.blood_group} ${data.component || 'Whole Blood'} at ${data.hospital_name || 'Hospital'}. Distance: ${data.distance_km || 'Nearby'} km`,
        '🚨 EMERGENCY BLOOD ALERT'
      );
    });

    // Listen for inventory updates
    s.on('inventory_update', (data) => {
      setLastInventoryEvent(data);
      if (['admin', 'bb_officer', 'hospital_user'].includes(user?.role)) {
        toast.info(
          `Unit ${data.unit_code || ''} is now ${data.status} (${data.component || ''})`,
          'Inventory Update'
        );
      }
    });

    // Listen for request status updates
    s.on('request_update', (data) => {
      toast.info(
        `Request #${data.request_id || ''} status updated to ${data.status}`,
        'Requisition Status'
      );
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  const clearAlerts = () => setLiveAlerts([]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        liveAlerts,
        lastInventoryEvent,
        clearAlerts
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
