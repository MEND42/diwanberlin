import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, CalendarDays, Settings, LayoutDashboard, Wifi, WifiOff } from 'lucide-react';
import { useAuth }     from '@/hooks/useAuth';
import { useSocket }   from '@/hooks/useSocket';
import { useAppStore } from '@/store/appStore';
import { cn, springs, ROLE_LABELS } from '@/lib/utils';

const TABS = [
  { label: 'Tische',        path: '/service/floor',        icon: Grid3X3,       roles: ['OWNER','MANAGER','WAITER'] },
  { label: 'Reservierungen',path: '/service/reservations', icon: CalendarDays,  roles: ['OWNER','MANAGER','WAITER'] },
  { label: 'Verwaltung',    path: '/management/dashboard', icon: LayoutDashboard,roles: ['OWNER','MANAGER'] },
  { label: 'Einstellungen', path: '/service/settings',     icon: Settings,      roles: ['OWNER','MANAGER','WAITER'] },
] as const;

export function ServiceShell() {
  const { user }         = useAuth();
  const { status }       = useSocket();
  const location         = useLocation();
  const navigate         = useNavigate();
  const pendingRes       = useAppStore(s => s.pendingReservations);

  const visibleTabs = TABS.filter(t => user && t.roles.includes(user.role as typeof t.roles[number]));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top status bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 pt-safe-top py-3 border-b border-diwan-gold/8 bg-paper"
        style={{ paddingTop: `max(12px, env(safe-area-inset-top))` }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg overflow-hidden">
            <img src="/uploads/diwan-logo-new.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-ink text-sm font-semibold leading-tight">Diwan Berlin</p>
            <p className="text-ink2 text-[10px] leading-tight">{ROLE_LABELS[user?.role ?? '']}</p>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium',
          status === 'connected'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200',
        )}>
          {status === 'connected' ? <Wifi size={10} /> : <WifiOff size={10} />}
          {status === 'connected' ? 'Live' : 'Offline'}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={springs.gentle}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 border-t border-diwan-gold/8 bg-diwan-bg px-2 py-2"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-around">
          {visibleTabs.map(tab => {
            const Icon    = tab.icon;
            const active  = location.pathname.startsWith(tab.path.split('/').slice(0, 3).join('/'));
            const badge   = tab.path.includes('reservations') ? pendingRes : 0;
            return (
              <motion.button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl relative"
              >
                <div className="relative">
                  <Icon
                    size={20}
                    className={cn(
                      'transition-colors',
                      active ? 'text-diwan-gold' : 'text-diwan-dim',
                    )}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-[9px] font-medium transition-colors',
                  active ? 'text-diwan-gold' : 'text-diwan-dim/60',
                )}>
                  {tab.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-diwan-gold"
                    transition={springs.snap}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
