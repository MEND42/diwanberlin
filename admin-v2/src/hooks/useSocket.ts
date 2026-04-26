import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3000' : '/';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

export function useSocket() {
  const { token, user, setBadge, addNotification } = useAppStore();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>('disconnected');

  useEffect(() => {
    if (!token || !user) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));

    // New order → invalidate orders query + badge + notification
    socket.on('order:new', (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      window.dispatchEvent(new CustomEvent('diwan:kds-order', { detail: order }));
      setBadge('activeOrders', (useAppStore.getState().activeOrders ?? 0) + 1);
      addNotification({
        type: 'order',
        title: `Neue Bestellung — Tisch ${order.table?.number ?? '?'}`,
        body: `#${order.orderNumber} · ${order.items?.length ?? 0} Artikel`,
      });
    });

    // Order updated → refresh KDS + table state
    socket.on('order:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    // Table status change
    socket.on('table:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    // New reservation
    socket.on('reservation:new', (res) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setBadge('pendingReservations', (useAppStore.getState().pendingReservations ?? 0) + 1);
      addNotification({
        type: 'reservation',
        title: 'Neue Reservierung',
        body: `${res.name} · ${res.date} ${res.time} · ${res.guests} Gäste`,
      });
    });

    socket.on('waiter:call', (call) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      window.dispatchEvent(new CustomEvent('diwan:waiter-call', { detail: call }));
      addNotification({
        type: 'waiter',
        title: `Tisch ${call.tableNumber} ruft`,
        body: call.label ? call.label : '🔔 Kellner wird gerufen',
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    };
  }, [token, user?.id]);

  return { status, socket: socketRef.current };
}
