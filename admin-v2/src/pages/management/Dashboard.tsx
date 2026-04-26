import { useQuery }  from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion }    from 'framer-motion';
import {
  ShoppingBag, Grid3X3, CalendarDays, Ticket,
  Users, ChefHat, ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { springs, cn } from '@/lib/utils';
import { useAppStore }  from '@/store/appStore';
import type { DashboardMetrics, BusyHour } from '@/types';

function MetricCard({
  label, value, sub, icon: Icon, color, onClick, delay = 0,
}: {
  label: string; value: string | number; sub?: string;
  icon: LucideIcon;
  color: string; onClick?: () => void; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.gentle, delay }}
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-diwan-gold/8 shadow-warm-sm ${onClick ? 'cursor-pointer hover:shadow-warm-md hover:-translate-y-0.5 transition-all' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink2 mb-2">{label}</p>
          <p className="text-3xl font-bold text-ink tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs text-ink2/70 mt-1.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  );
}

function QuickAction({ label, icon: Icon, path, badge }: {
  label: string; icon: LucideIcon;
  path: string; badge?: number;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-white border border-diwan-gold/8 hover:border-diwan-gold/25 hover:shadow-warm-sm transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-diwan-gold/10 flex items-center justify-center">
          <Icon size={15} className="text-diwan-gold" />
        </div>
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge != null && badge > 0 && (
          <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-2 py-0.5">{badge}</span>
        )}
        <ArrowRight size={14} className="text-ink2/40 group-hover:text-diwan-gold transition-colors" />
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-diwan-gold/8 animate-pulse">
      <div className="h-3 bg-paper2 rounded w-24 mb-3" />
      <div className="h-8 bg-paper2 rounded w-16 mb-2" />
      <div className="h-2.5 bg-paper2 rounded w-20" />
    </div>
  );
}

function BusyHoursChart({ data }: { data: BusyHour[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="bg-white rounded-2xl border border-diwan-gold/8 shadow-warm-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink2">Stoßzeiten</h3>
        <span className="text-[10px] text-ink2/60">Letzte 30 Tage</span>
      </div>
      <div className="flex items-end justify-between gap-1 h-24">
        {data.map((item, i) => {
          const height = item.count > 0 ? Math.max((item.count / maxCount) * 100, 8) : 4;
          const isPeak = item.count >= maxCount * 0.7;
          return (
            <div key={item.hour} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ ...springs.gentle, delay: i * 0.02 }}
                className={cn(
                  'w-full rounded-t-md',
                  isPeak ? 'bg-diwan-gold' : 'bg-diwan-gold/40'
                )}
                title={`${item.count} Reservierungen`}
              />
              <span className="text-[8px] text-ink2/60">{item.hour}:00</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-2xl border border-diwan-gold/8 shadow-warm-sm p-5">
      <div className="h-4 bg-paper2 rounded w-24 mb-4 animate-pulse" />
      <div className="flex items-end justify-between gap-1 h-24">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="flex-1 bg-paper2 rounded-t-md animate-pulse" style={{ height: `${Math.random() * 60 + 20}%` }} />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate     = useNavigate();
  const pendingRes   = useAppStore(s => s.pendingReservations);
  const pendingEv    = useAppStore(s => s.pendingEvents);

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn:  dashboardApi.metrics,
    refetchInterval: 30_000,
    retry: false,
  });

  const { data: busyHours, isLoading: loadingBusy } = useQuery<BusyHour[]>({
    queryKey: ['dashboard-busy-hours'],
    queryFn: dashboardApi.busyHours,
    refetchInterval: 300_000,
    staleTime: 300_000,
  });

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">{today}</p>
        <h2 className="font-display text-ink text-2xl font-normal">Guten Tag, <em>Überblick</em></h2>
      </motion.div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" data-tour="dashboard-overview">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              label="Aktive Bestellungen" delay={0}
              value={metrics?.activeOrders ?? 0}
              sub="Offen in der Küche"
              icon={ShoppingBag}
              color="bg-amber-50 text-amber-600"
              onClick={() => navigate('/kitchen')}
            />
            <MetricCard
              label="Belegte Tische" delay={0.05}
              value={`${metrics?.occupiedTables ?? 0}/${metrics?.totalTables ?? 30}`}
              sub="Tische belegt"
              icon={Grid3X3}
              color="bg-blue-50 text-blue-600"
              onClick={() => navigate('/management/tables')}
            />
            <MetricCard
              label="Reservierungen" delay={0.1}
              value={metrics?.pendingReservations ?? 0}
              sub="Ausstehend"
              icon={CalendarDays}
              color="bg-purple-50 text-purple-600"
              onClick={() => navigate('/management/reservations')}
            />
            <MetricCard
              label="Event-Anfragen" delay={0.15}
              value={metrics?.pendingEvents ?? 0}
              sub="Ausstehend"
              icon={Ticket}
              color="bg-green-50 text-green-700"
              onClick={() => navigate('/management/events')}
            />
          </>
        )}
      </div>

      {/* Busy Hours Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.gentle, delay: 0.18 }}
      >
        {loadingBusy ? <SkeletonChart /> : busyHours && <BusyHoursChart data={busyHours} />}
      </motion.div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.gentle, delay: 0.2 }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink2 mb-3">Schnellzugriff</h3>
          <div className="space-y-2" data-tour="quick-actions">
            <QuickAction label="Tische & Bestellungen" icon={Grid3X3}      path="/management/tables" />
            <QuickAction label="Küchen-Display"        icon={ChefHat}       path="/kitchen" />
            <QuickAction label="Reservierungen"        icon={CalendarDays}  path="/management/reservations" badge={pendingRes} />
            <QuickAction label="Event-Anfragen"        icon={Ticket}        path="/management/events" badge={pendingEv} />
            <QuickAction label="Kunden & Rabatte"      icon={Users}         path="/management/customers" />
          </div>
        </motion.div>

        {/* Staff overview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.gentle, delay: 0.25 }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink2 mb-3">Heute im Dienst</h3>
          <div className="bg-white rounded-2xl border border-diwan-gold/8 shadow-warm-sm p-5 flex items-center justify-center min-h-[180px]">
            {isLoading ? (
              <div className="animate-pulse space-y-3 w-full">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-paper2 rounded-xl" />)}
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-diwan-gold/10 flex items-center justify-center mx-auto mb-3">
                  <Users size={20} className="text-diwan-gold" />
                </div>
                <p className="text-2xl font-bold text-ink mb-1">{metrics?.staffClockedIn ?? 0}</p>
                <p className="text-xs text-ink2">Mitarbeiter eingestempelt</p>
                <button
                  onClick={() => navigate('/management/hr')}
                  className="mt-4 text-xs text-diwan-gold font-medium hover:underline"
                >
                  Schichtplan öffnen →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
