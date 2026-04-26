import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import type { Role } from '@/types';

interface Props {
  children: ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, token, clearAuth, setUser } = useAppStore();
  const location = useLocation();

  const session = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 30_000,
    enabled: Boolean(token && user),
  });

  useEffect(() => {
    if (session.data) setUser(session.data);
  }, [session.data, setUser]);

  useEffect(() => {
    if (session.isError) clearAuth();
  }, [session.isError, clearAuth]);

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (session.isLoading || session.isFetching) {
    return (
      <div className="min-h-screen grid place-items-center bg-diwan-bg text-diwan-muted">
        <div className="h-9 w-9 rounded-full border-2 border-diwan-gold/20 border-t-diwan-gold animate-spin" />
      </div>
    );
  }

  if (session.isError) {
    return <Navigate to="/login" state={{ from: location, message: 'Sitzung abgelaufen. Bitte erneut anmelden.' }} replace />;
  }

  const verifiedRole = (session.data?.role ?? user.role) as Role;

  if (allowedRoles && !allowedRoles.includes(verifiedRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
