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
  const [lastRequestEvent, setLastRequestEvent] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('bb_token');
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true
    });

    s.on('connect', () => {
      setIsConnected(true);
      if (token) {
        s.emit('authenticate', token);
      }
      const role = user?.role || user?.role_name;
      if (role) {
        s.emit('join_role', role);
        s.emit('join', `role_${role}`);
        if (user.donor_id) {
          s.emit('join_donor', user.donor_id);
          s.emit('join', `donor_${user.donor_id}`);
        }
        if (user.hospital_id) {
          s.emit('join_hospital', user.hospital_id);
          s.emit('join', `hospital_${user.hospital_id}`);
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

    s.on('emergency_alert_broadcast', (data) => {
      setLiveAlerts((prev) => [data, ...prev]);
    });

    // Listen for inventory updates
    s.on('inventory_update', (data) => {
      setLastInventoryEvent(data);
      const role = user?.role || user?.role_name;
      if (['admin', 'bb_officer', 'hospital_user', 'lab_tech'].includes(role)) {
        toast.info(
          `Inventory Update: ${data.action || 'Unit status change'} ${data.unit_code ? `(${data.unit_code})` : ''}`,
          'Stock Updated'
        );
      }
    });

    // Listen for new incoming blood requests
    s.on('new_blood_request', (data) => {
      setLastRequestEvent(data);
      const role = user?.role || user?.role_name;
      if (['admin', 'bb_officer'].includes(role)) {
        toast.info(
          `New ${data.urgency || 'ROUTINE'} Requisition #${data.request_id} received for ${data.blood_group} ${data.component}!`,
          'Incoming Order'
        );
      }
    });

    // Listen for request status updates (allocation, cancellation, fulfillment)
    s.on('request_update', (data) => {
      setLastRequestEvent(data);
      toast.info(
        `Requisition #${data.request_id || ''} is now ${data.status || 'UPDATED'}`,
        'Order Status Changed'
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
        lastRequestEvent,
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
