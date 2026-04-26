import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser, Role } from '@/types';

interface Notification {
  id: string;
  type: 'order' | 'reservation' | 'event' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface AppState {
  // Auth
  user: AdminUser | null;
  token: string | null;
  rememberMe: boolean;

  // Live badges
  pendingReservations: number;
  pendingEvents: number;
  activeOrders: number;

  // Notifications tray
  notifications: Notification[];

  // Actions
  setAuth: (user: AdminUser, token: string, remember: boolean) => void;
  clearAuth: () => void;
  setUser: (user: Partial<AdminUser>) => void;
  setBadge: (key: 'pendingReservations' | 'pendingEvents' | 'activeOrders', value: number) => void;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      rememberMe: false,
      pendingReservations: 0,
      pendingEvents: 0,
      activeOrders: 0,
      notifications: [],

      setAuth: (user, token, rememberMe) => {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('diwanAdminToken', token);
        storage.setItem('diwanAdminUser', JSON.stringify(user));
        set({ user, token, rememberMe });
      },

      clearAuth: () => {
        localStorage.removeItem('diwanAdminToken');
        localStorage.removeItem('diwanAdminUser');
        sessionStorage.removeItem('diwanAdminToken');
        sessionStorage.removeItem('diwanAdminUser');
        set({ user: null, token: null, notifications: [] });
      },

      setUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),

      setBadge: (key, value) => set({ [key]: value }),

      addNotification: (n) =>
        set((s) => ({
          notifications: [
            {
              ...n,
              id: Math.random().toString(36).slice(2),
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...s.notifications.slice(0, 49),
          ],
        })),

      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'diwan-admin-store',
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        rememberMe: s.rememberMe,
      }),
    },
  ),
);

// Shell selector — derived from role
export function getDefaultShell(role: Role): 'management' | 'service' | 'kitchen' {
  if (role === 'KITCHEN') return 'kitchen';
  if (role === 'WAITER')  return 'service';
  return 'management';
}

export const ROLE_SHELL_ACCESS: Record<Role, Array<'management' | 'service' | 'kitchen'>> = {
  OWNER:   ['management', 'service', 'kitchen'],
  MANAGER: ['management', 'service', 'kitchen'],
  WAITER:  ['service', 'management'],
  KITCHEN: ['kitchen'],
};
