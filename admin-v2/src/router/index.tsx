import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

import { Login }           from '@/pages/Login';
import { ChangePassword }  from '@/pages/ChangePassword';
import { Unauthorized }    from '@/pages/Unauthorized';

import { ManagementShell } from '@/shells/ManagementShell';
import { ServiceShell }    from '@/shells/ServiceShell';
import { KitchenShell }    from '@/shells/KitchenShell';

import { Dashboard }       from '@/pages/management/Dashboard';
import { Tables }          from '@/pages/management/Tables';
import { Menu }            from '@/pages/management/Menu';
import { Reservations }    from '@/pages/management/Reservations';
import { Events }          from '@/pages/management/Events';
import { EventListings }   from '@/pages/management/EventListings';
import { Customers }       from '@/pages/management/Customers';
import { TeamAccounts }    from '@/pages/management/TeamAccounts';
import { HR }              from '@/pages/management/HR';
import { Website }         from '@/pages/management/Website';
import { AccountSettings } from '@/pages/management/AccountSettings';

import { FloorPlan }       from '@/pages/service/FloorPlan';
import { KDS }             from '@/pages/kitchen/KDS';

import { useAppStore, getDefaultShell } from '@/store/appStore';

function RootRedirect() {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${getDefaultShell(user.role)}`} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"         element={<Login />} />
      <Route path="/change-password" element={
        <ProtectedRoute><ChangePassword /></ProtectedRoute>
      } />
      <Route path="/unauthorized"  element={<Unauthorized />} />
      <Route path="/"              element={<RootRedirect />} />

      {/* Management shell — Owner + Manager + limited Waiter */}
      <Route path="/management" element={
        <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'WAITER']}>
          <ManagementShell />
        </ProtectedRoute>
      }>
        <Route index              element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="tables"      element={<Tables />} />
        <Route path="menu"        element={
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}><Menu /></ProtectedRoute>
        } />
        <Route path="reservations" element={<Reservations />} />
        <Route path="events"       element={
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}><Events /></ProtectedRoute>
        } />
        <Route path="event-listings" element={
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}><EventListings /></ProtectedRoute>
        } />
        <Route path="customers"   element={<Customers />} />
        <Route path="hr"          element={<HR />} />
        <Route path="website"     element={
          <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}><Website /></ProtectedRoute>
        } />
        <Route path="team"        element={
          <ProtectedRoute allowedRoles={['OWNER']}><TeamAccounts /></ProtectedRoute>
        } />
        <Route path="settings"    element={<AccountSettings />} />
      </Route>

      {/* Service shell — Waiter + Manager + Owner */}
      <Route path="/service" element={
        <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'WAITER']}>
          <ServiceShell />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="floor" replace />} />
        <Route path="floor"        element={<FloorPlan />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="settings"     element={<AccountSettings />} />
      </Route>

      {/* Kitchen shell — Kitchen only (+ Owner/Manager for monitoring) */}
      <Route path="/kitchen" element={
        <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'KITCHEN']}>
          <KitchenShell />
        </ProtectedRoute>
      }>
        <Route index element={<KDS />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
