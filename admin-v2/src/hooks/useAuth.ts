import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, getDefaultShell } from '@/store/appStore';
import { authApi } from '@/lib/api';
import { isTokenExpired, haptic } from '@/lib/utils';
import type { AdminUser } from '@/types';

const INACTIVITY_LIMITS: Record<string, number> = {
  KITCHEN: Infinity,
  OWNER:   2 * 60 * 60 * 1000,  // 2 hours
  MANAGER: 2 * 60 * 60 * 1000,
  WAITER:  30 * 60 * 1000,       // 30 minutes
};

export function useAuth() {
  const { user, token, setAuth, clearAuth } = useAppStore();
  const navigate = useNavigate();
  const inactivityRef = useRef<ReturnType<typeof setTimeout>>();
  const isAuthenticated = Boolean(user && token);

  const logout = useCallback((reason?: string) => {
    clearAuth();
    haptic('tap');
    navigate('/login', reason ? { state: { message: reason } } : undefined);
  }, [clearAuth, navigate]);

  // Watch for 401 events from the API client
  useEffect(() => {
    const handle = () => logout('Sitzung abgelaufen. Bitte erneut anmelden.');
    window.addEventListener('diwan:unauthorized', handle);
    return () => window.removeEventListener('diwan:unauthorized', handle);
  }, [logout]);

  // Check token expiry on mount and tab focus
  useEffect(() => {
    if (!token) return;
    const check = () => {
      if (isTokenExpired(token)) logout('Sitzung abgelaufen. Bitte erneut anmelden.');
    };
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [token, logout]);

  // Inactivity timer — resets on user interaction
  useEffect(() => {
    if (!user) return;
    const limit = INACTIVITY_LIMITS[user.role] ?? INACTIVITY_LIMITS.OWNER;
    if (limit === Infinity) return;

    const reset = () => {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = setTimeout(
        () => logout('Automatisch abgemeldet wegen Inaktivität.'),
        limit,
      );
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(inactivityRef.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user, logout]);

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean) => {
      const data = await authApi.login(username, password);
      const adminUser: AdminUser = {
        id:                 data.id,
        username:           data.username,
        displayName:        data.displayName,
        role:               data.role as AdminUser['role'],
        mustChangePassword: data.mustChangePassword,
      };
      setAuth(adminUser, data.token, rememberMe);
      haptic('success');

      if (data.mustChangePassword) {
        navigate('/change-password');
      } else {
        const shell = getDefaultShell(adminUser.role);
        navigate(`/${shell}`);
      }
    },
    [setAuth, navigate],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await authApi.changePassword(currentPassword, newPassword);
      useAppStore.getState().setUser({ mustChangePassword: false });
      haptic('success');
      const shell = getDefaultShell(user!.role);
      navigate(`/${shell}`);
    },
    [user, navigate],
  );

  return { user, token, isAuthenticated, login, logout, changePassword };
}
