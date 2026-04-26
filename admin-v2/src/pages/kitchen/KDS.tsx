import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ordersApi } from '@/lib/api';
import { cn, orderAgeMinutes, springs, haptic } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';

const COLUMNS: { status: OrderStatus; label: string; accent: string; next: OrderStatus | null }[] = [
  { status: 'NEW',       label: 'Neu',            accent: '#ef4444', next: 'PREPARING' },
  { status: 'PREPARING', label: 'In Zubereitung', accent: '#f59e0b', next: 'READY'     },
  { status: 'READY',     label: 'Bereit',          accent: '#22c55e', next: 'SERVED'    },
];

function ageColor(mins: number): string {
  if (mins < 5)  return 'text-green-400';
  if (mins < 10) return 'text-amber-400';
  return 'text-red-400';
}

function ageBg(mins: number): string {
  if (mins < 5)  return 'border-green-500/20 bg-green-500/4';
  if (mins < 10) return 'border-amber-500/30 bg-amber-500/6';
  return 'border-red-500/40 bg-red-500/8';
}

function LiveTimer({ createdAt }: { createdAt: string }) {
  const [mins, setMins] = useState(() => orderAgeMinutes(createdAt));
  useEffect(() => {
    const id = setInterval(() => setMins(orderAgeMinutes(createdAt)), 10_000);
    return () => clearInterval(id);
  }, [createdAt]);

  const display = mins < 60
    ? `${mins}m`
    : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <span className={cn('text-lg font-mono font-bold tabular-nums', ageColor(mins))}>
      {display}
    </span>
  );
}

function TicketCard({ order, onAdvance }: { order: Order; onAdvance: () => void }) {
  const mins = orderAgeMinutes(order.createdAt);

  return (
    <motion.div
      layout
      layoutId={order.id}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      transition={springs.gentle}
      onClick={() => { haptic('tap'); onAdvance(); }}
      className={cn(
        'cursor-pointer rounded-xl border p-3.5 transition-all active:scale-97',
        'hover:brightness-110',
        ageBg(mins),
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/8">
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-kds-text/50 font-medium">Tisch</p>
          <p className="font-display text-3xl font-bold text-kds-text leading-none">
            {order.table?.number ?? '?'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-kds-text/40 mb-0.5">#{order.orderNumber}</p>
          <LiveTimer createdAt={order.createdAt} />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] text-kds-text/80 leading-tight flex-1">{item.menuItem?.nameDe}</span>
            <span className="text-base font-bold text-kds-text flex-shrink-0">×{item.quantity}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-[11px] text-amber-400/80 mt-2 pt-2 border-t border-white/8 italic">
            {order.notes}
          </p>
        )}
      </div>

      {/* Tap hint */}
      <p className="text-[9px] text-kds-text/25 uppercase tracking-widest text-center mt-3 pt-2 border-t border-white/5">
        Tippen zum Weiterleiten
      </p>
    </motion.div>
  );
}

export function KDS() {
  const qc = useQueryClient();

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn:  ordersApi.list,
    refetchInterval: 8_000,
  });

  const advanceMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      haptic('success');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const activeOrders = orders.filter(o =>
    ['NEW', 'PREPARING', 'READY'].includes(o.status),
  );

  return (
    <div className="h-full grid grid-cols-3 gap-0 bg-kds-bg">
      {COLUMNS.map(col => {
        const colOrders = activeOrders
          .filter(o => o.status === col.status)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return (
          <div key={col.status} className="flex flex-col border-r border-kds-border last:border-r-0">
            {/* Column header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: `2px solid ${col.accent}` }}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.accent }} />
                <span className="text-xs font-bold tracking-[0.14em] uppercase text-kds-text/80">
                  {col.label}
                </span>
              </div>
              <motion.span
                key={`${col.status}-${colOrders.length}`}
                initial={{ scale: 1.35, opacity: 0.75 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springs.snap}
                className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
                style={{ background: `${col.accent}22`, color: col.accent }}
              >
                {colOrders.length}
              </motion.span>
            </div>

            {/* Tickets */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <AnimatePresence mode="popLayout">
                {colOrders.map(order => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    onAdvance={() => col.next && advanceMut.mutate({ id: order.id, status: col.next })}
                  />
                ))}
              </AnimatePresence>

              {colOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-20">
                  <div className="w-8 h-8 rounded-lg border-2 border-kds-text/20" />
                  <p className="text-[10px] uppercase tracking-widest text-kds-text/40">Leer</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
