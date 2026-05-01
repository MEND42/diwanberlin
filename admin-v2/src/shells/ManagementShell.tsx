import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Grid3X3, ChefHat, BookOpen,
  CalendarDays, Ticket, CalendarRange, Users,
  Clock, Globe, UserCog, Settings, LogOut,
  Bell, Wifi, WifiOff, Search, X,
  ChevronRight,
} from 'lucide-react';
import { useAuth }      from '@/hooks/useAuth';
import { useSocket }    from '@/hooks/useSocket';
import { useTour }      from '@/hooks/useTour';
import { useAppStore }  from '@/store/appStore';
import { cn, getInitials, ROLE_LABELS, springs } from '@/lib/utils';
import { WaiterCallBanner } from '@/components/WaiterCallBanner';
import { TourOverlay } from '@/components/TourOverlay';
import { useAdminI18n, type AdminI18nKey } from '@/lib/adminI18n';
import type { NavItem, Role } from '@/types';

const NAV: (NavItem & { titleKey: AdminI18nKey; metaKey: AdminI18nKey })[] = [
  { view: 'dashboard',      path: '/management/dashboard',      title: 'Dashboard',       titleKey: 'dashboard',      meta: 'Überblick & Kennzahlen', metaKey: 'dashboardMeta', icon: LayoutDashboard, roles: ['OWNER','MANAGER','WAITER'], section: 'service' },
  { view: 'tables',         path: '/management/tables',         title: 'Tische',          titleKey: 'tables',         meta: 'Belegung & Status',      metaKey: 'tablesMeta',      icon: Grid3X3,         roles: ['OWNER','MANAGER','WAITER'], section: 'service' },
  { view: 'orders',         path: '/kitchen',                   title: 'Küchen-KDS',      titleKey: 'orders',         meta: 'Live Bestellungen',      metaKey: 'ordersMeta',      icon: ChefHat,         roles: ['OWNER','MANAGER'],          section: 'service' },
  { view: 'reservations',   path: '/management/reservations',   title: 'Reservierungen',  titleKey: 'reservations',   meta: 'Tische zuweisen',        metaKey: 'reservationsMeta', icon: CalendarDays,    roles: ['OWNER','MANAGER','WAITER'], section: 'planning', badgeKey: 'reservations' },
  { view: 'events',         path: '/management/events',         title: 'Event-Anfragen',  titleKey: 'events',         meta: 'Anfragen bearbeiten',    metaKey: 'eventsMeta',       icon: Ticket,          roles: ['OWNER','MANAGER'],          section: 'planning', badgeKey: 'events' },
  { view: 'event-listings', path: '/management/event-listings', title: 'Eventkalender',   titleKey: 'eventListings',  meta: 'Website Events',         metaKey: 'eventListingsMeta', icon: CalendarRange,   roles: ['OWNER','MANAGER'],          section: 'planning' },
  { view: 'menu',           path: '/management/menu',           title: 'Speisekarte',     titleKey: 'menu',           meta: 'Kategorien & Artikel',   metaKey: 'menuMeta',         icon: BookOpen,        roles: ['OWNER','MANAGER'],          section: 'management' },
  { view: 'customers',      path: '/management/customers',      title: 'Kunden & Rabatte',titleKey: 'customers',      meta: 'Treue und Codes',        metaKey: 'customersMeta',    icon: Users,           roles: ['OWNER','MANAGER'],          section: 'management' },
  { view: 'hr',             path: '/management/hr',             title: 'Team & Zeiten',   titleKey: 'hr',             meta: 'Planung und Schichten',  metaKey: 'hrMeta',           icon: Clock,           roles: ['OWNER','MANAGER','WAITER'], section: 'management' },
  { view: 'website',        path: '/management/website',        title: 'Website',         titleKey: 'website',        meta: 'Texte ohne Code',        metaKey: 'websiteMeta',      icon: Globe,           roles: ['OWNER','MANAGER'],          section: 'management' },
  { view: 'team',           path: '/management/team',           title: 'Teamkonten',      titleKey: 'team',           meta: 'Rollen und Zugriff',     metaKey: 'teamMeta',         icon: UserCog,         roles: ['OWNER'],                    section: 'management' },
  { view: 'settings',       path: '/management/settings',       title: 'Einstellungen',   titleKey: 'settings',       meta: 'Kapazitäten & mehr',     metaKey: 'settingsMeta',     icon: Settings,        roles: ['OWNER','MANAGER'],          section: 'management' },
];

const SECTIONS = [
  { key: 'service',    label: 'Service' },
  { key: 'planning',   label: 'Planung' },
  { key: 'management', label: 'Verwaltung' },
] as const;

function NavItemRow({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <motion.button
      onClick={() => navigate(item.path)}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group relative',
        active
          ? 'bg-diwan-gold/12 text-diwan-cream'
          : 'text-diwan-dim hover:text-diwan-cream hover:bg-white/5',
      )}
      data-tour={item.view === 'reservations' ? 'nav-reservations' : undefined}
    >
      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="nav-active-bar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-diwan-gold rounded-full"
          transition={springs.snap}
        />
      )}
      <Icon size={16} className={active ? 'text-diwan-gold' : 'text-diwan-dim group-hover:text-diwan-cream'} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight truncate">{item.title}</div>
        <div className="text-[10px] text-diwan-dim/60 leading-tight mt-0.5 truncate">{item.meta}</div>
      </div>
      {badge != null && badge > 0 && (
        <span className="flex-shrink-0 text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </motion.button>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { t } = useAdminI18n();
  const [q, setQ] = useState('');
  const navigate  = useNavigate();

  const results = NAV.filter(n =>
    t(n.titleKey).toLowerCase().includes(q.toLowerCase()) ||
    t(n.metaKey).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(10,6,2,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -12 }}
        transition={springs.snap}
        className="w-full max-w-lg overflow-hidden rounded-2xl shadow-warm-lg"
        style={{ background: 'rgba(34,20,8,0.98)', border: '1px solid rgba(200,146,42,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search size={15} className="text-diwan-dim flex-shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="flex-1 bg-transparent text-diwan-cream text-sm placeholder-diwan-dim/50 outline-none"
          />
          <kbd className="text-[10px] text-diwan-dim/50 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="p-2 max-h-72 overflow-y-auto">
          {results.length === 0 && (
            <p className="text-center text-diwan-dim text-sm py-6">{t('noResults')}</p>
          )}
          {results.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => { navigate(item.path); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/6 text-diwan-cream group transition-colors"
              >
                <Icon size={15} className="text-diwan-gold flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{t(item.titleKey)}</div>
                  <div className="text-[11px] text-diwan-dim/70">{t(item.metaKey)}</div>
                </div>
                <ChevronRight size={13} className="text-diwan-dim/40 group-hover:text-diwan-dim transition-colors" />
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ManagementShell() {
  const { lang, setLang, t } = useAdminI18n();
  const { user, logout }   = useAuth();
  const { status }         = useSocket();
  const location           = useLocation();
  const navigate           = useNavigate();
  const notifications      = useAppStore(s => s.notifications);
  const pendingRes         = useAppStore(s => s.pendingReservations);
  const pendingEv          = useAppStore(s => s.pendingEvents);
  const markAllRead        = useAppStore(s => s.markAllRead);
  const dismissNotif       = useAppStore(s => s.dismissNotification);
  const tour               = useTour();

  const [cmdOpen,    setCmdOpen]    = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);

  const unread = notifications.filter(n => !n.read).length;

  const visibleNav = NAV.filter(n => user && n.roles.includes(user.role));

  function getBadge(item: NavItem): number | undefined {
    if (item.badgeKey === 'reservations') return pendingRes;
    if (item.badgeKey === 'events')       return pendingEv;
    return undefined;
  }

  // Keyboard shortcut: Cmd/Ctrl+K
  useState(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const current = visibleNav.find(n => location.pathname.startsWith(n.path));
  const currentTitle = current ? t(current.titleKey) : t('dashboard');

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Sidebar */}
      <aside className="flex flex-col w-60 flex-shrink-0 border-r border-white/6"
        style={{ background: '#180e04' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/6">
          <div className="w-16 h-9 flex-shrink-0">
            <img src="/uploads/diwan-logo-transparent.png" alt="" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div>
            <div className="text-diwan-cream font-display text-base leading-tight">Diwan Berlin</div>
            <div className="text-diwan-dim text-[10px] tracking-wide">{t('adminLabel')}</div>
          </div>
        </div>

        {/* Shell switcher for non-kitchen roles */}
        {user && user.role !== 'KITCHEN' && (
          <div className="px-3 py-3 border-b border-white/6" data-tour="shell-switcher">
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: t('management'), path: '/management/dashboard' },
                { label: t('service'),    path: '/service/floor' },
              ].map(({ label, path }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'text-[11px] font-semibold py-1.5 rounded-lg transition-all',
                    location.pathname.startsWith(path.split('/')[1] === 'management' ? '/management' : '/service')
                      ? 'bg-diwan-gold text-diwan-bg'
                      : 'text-diwan-dim hover:text-diwan-cream hover:bg-white/5',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {SECTIONS.map(({ key }) => {
            const items = visibleNav.filter(n => n.section === key);
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-diwan-dim/40 px-3 mb-1.5">{t(key)}</p>
                <div className="space-y-0.5">
                  {items.map(item => (
                    <NavItemRow
                      key={item.view}
                      item={{ ...item, title: t(item.titleKey), meta: t(item.metaKey) }}
                      active={location.pathname.startsWith(item.path)}
                      badge={getBadge(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User box */}
        <div className="border-t border-white/6 p-3 space-y-1">
          <a
            href="https://www.gandomai.com"
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06] transition-colors"
          >
            <img src="/uploads/partners/gandom-ai-logo.png" alt="Gandom AI" className="h-5 w-5 rounded object-cover" />
            <span className="text-[10px] leading-tight text-diwan-dim">
              {t('developedBy')} <span className="text-diwan-cream">Gandom AI</span>
            </span>
          </a>
          <button
            onClick={() => navigate('/management/account')}
            data-tour="account-settings"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-diwan-gold/20 flex items-center justify-center flex-shrink-0 text-diwan-gold text-xs font-bold">
              {getInitials(user?.displayName ?? user?.username ?? 'A')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-diwan-cream text-xs font-medium truncate">
                {user?.displayName ?? user?.username}
              </div>
              <div className="text-diwan-dim/60 text-[10px]">{ROLE_LABELS[user?.role ?? '']}</div>
            </div>
            <Settings size={13} className="text-diwan-dim/40 group-hover:text-diwan-dim transition-colors" />
          </button>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-diwan-dim hover:text-red-400 hover:bg-red-500/6 transition-colors text-xs"
          >
            <LogOut size={13} />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-diwan-gold/8 bg-paper/95"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <h1 className="font-display text-ink text-lg font-normal">{currentTitle}</h1>

          <div className="flex items-center gap-2">
            {/* Search / command palette */}
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-ink2 hover:bg-paper2 transition-colors text-xs border border-diwan-gold/10"
            >
              <Search size={13} />
              <span className="hidden sm:inline">{t('search')}</span>
              <kbd className="hidden sm:inline text-[9px] opacity-50 border border-ink2/20 rounded px-1">⌘K</kbd>
            </button>

            {/* Live status */}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border',
              status === 'connected'
                ? 'text-green-700 border-green-200 bg-green-50'
                : 'text-amber-700 border-amber-200 bg-amber-50',
            )}>
              {status === 'connected'
                ? <Wifi size={11} />
                : <WifiOff size={11} />
              }
              <span className="hidden sm:inline">{status === 'connected' ? t('live') : t('offline')}</span>
            </div>

            <button
              onClick={() => setLang(lang === 'de' ? 'fa' : 'de')}
              className="min-w-12 rounded-xl border border-diwan-gold/15 px-3 py-1.5 text-xs font-bold text-ink2 hover:bg-paper2 hover:text-ink transition-colors"
            >
              {lang === 'de' ? 'فارسی' : 'DE'}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(v => !v); if (unread > 0) markAllRead(); }}
                data-tour="notifications"
                className="relative w-8 h-8 flex items-center justify-center rounded-xl hover:bg-paper2 transition-colors text-ink2"
              >
                <Bell size={15} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={springs.snap}
                    className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-warm-lg border border-diwan-gold/10 overflow-hidden z-30"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-paper2">
                      <span className="text-sm font-semibold text-ink">Benachrichtigungen</span>
                      <button onClick={() => setNotifOpen(false)} className="text-ink2 hover:text-ink">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0
                        ? <p className="text-center text-ink2 text-sm py-8">Keine Benachrichtigungen</p>
                        : notifications.slice(0, 20).map(n => (
                            <div
                              key={n.id}
                              className={cn(
                                'flex items-start gap-3 px-4 py-3 border-b border-paper2 last:border-0 transition-colors',
                                n.type === 'waiter'
                                  ? 'bg-amber-50 hover:bg-amber-100/60'
                                  : 'hover:bg-paper',
                              )}
                            >
                              {n.type === 'waiter' && (
                                <span className="text-base flex-shrink-0 mt-0.5">🔔</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  'text-xs font-semibold',
                                  n.type === 'waiter' ? 'text-amber-800' : 'text-ink',
                                )}>
                                  {n.title}
                                </p>
                                <p className="text-[11px] text-ink2 mt-0.5 truncate">{n.body}</p>
                              </div>
                              <button
                                onClick={() => dismissNotif(n.id)}
                                className="flex-shrink-0 text-ink2/40 hover:text-ink2 transition-colors mt-0.5"
                                aria-label="Entfernen"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={springs.gentle}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
      </AnimatePresence>

      {/* Waiter call urgent banners */}
      <WaiterCallBanner />
      <TourOverlay
        active={tour.active}
        step={tour.step}
        index={tour.index}
        total={tour.steps.length}
        onNext={tour.next}
        onSkip={tour.finish}
      />
    </div>
  );
}
