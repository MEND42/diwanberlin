import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, CalendarDays, Settings, LayoutDashboard, Wifi, WifiOff, type LucideIcon } from 'lucide-react';
import { useAuth }     from '@/hooks/useAuth';
import { useSocket }   from '@/hooks/useSocket';
import { useAppStore } from '@/store/appStore';
import { cn, springs, ROLE_LABELS } from '@/lib/utils';
import { WaiterCallBanner } from '@/components/WaiterCallBanner';
import type { Role } from '@/types';

interface Tab { label: string; path: string; icon: LucideIcon; roles: Role[] }
const TABS: Tab[] = [
  { label: 'Tische',        path: '/service/floor',        icon: Grid3X3,        roles: ['OWNER','MANAGER','WAITER'] },
  { label: 'Reservierungen',path: '/service/reservations', icon: CalendarDays,   roles: ['OWNER','MANAGER','WAITER'] },
  { label: 'Verwaltung',    path: '/management/dashboard', icon: LayoutDashboard, roles: ['OWNER','MANAGER'] },
  { label: 'Einstellungen', path: '/service/settings',     icon: Settings,       roles: ['OWNER','MANAGER','WAITER'] },
];

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
          <div className="w-16 h-9">
            <img src="/uploads/diwan-logo-transparent.png" alt="" className="w-full h-full object-contain drop-shadow-md" />
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

      {/* Waiter call urgent banners */}
      <WaiterCallBanner />

      {/* Bottom tab bar */}
      <nav className="flex-shrink-0 border-t border-diwan-gold/10 bg-diwan-bg px-2 py-3 shadow-[0_-12px_34px_rgba(0,0,0,0.18)]"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-4 gap-1">
          {visibleTabs.map(tab => {
            const Icon    = tab.icon;
            const active  = location.pathname.startsWith(tab.path.split('/').slice(0, 3).join('/'));
            const badge   = tab.path.includes('reservations') ? pendingRes : 0;
            return (
              <motion.button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'relative flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2',
                  active ? 'bg-diwan-gold/12' : 'hover:bg-white/5',
                )}
              >
                <div className="relative">
                  <Icon
                    size={24}
                    className={cn(
                      'transition-colors',
                      active ? 'text-diwan-gold' : 'text-diwan-dim',
                    )}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-bold transition-colors leading-tight',
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
