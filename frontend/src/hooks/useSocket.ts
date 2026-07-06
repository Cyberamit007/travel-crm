import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification } from '../types/index';
import { useAuthStore } from '../store/authStore';

export function useSocket() {
  const { user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token || !user) return;

    // In production VITE_API_URL points to the Railway backend; dev uses Vite proxy
    const socketUrl = import.meta.env.VITE_API_URL || '/';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', `user:${user.id}`);
    });

    socket.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, clearNotification, unreadCount };
}
