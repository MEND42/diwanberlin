import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Check, X, Clock, Users, Phone, Mail, MessageSquare } from 'lucide-react';
import { reservationsApi, tablesApi } from '@/lib/api';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { cn, springs } from '@/lib/utils';
import type { Reservation, Table } from '@/types';

const STATUS = {
  PENDING:   { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Ausstehend' },
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Bestätigt' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-600', label: 'Storniert' },
} as const;

function dateLabel(reservation: Reservation) {
  const date = new Date(reservation.date);
  return Number.isNaN(date.getTime())
    ? reservation.date
    : date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function ServiceReservations() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations'],
    queryFn: reservationsApi.list,
    refetchInterval: 15_000,
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: tablesApi.list,
  });

  const upcoming = reservations
    .filter(r => r.status !== 'CANCELLED')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  async function changeStatus(reservation: Reservation, status: 'CONFIRMED' | 'CANCELLED') {
    setUpdating(reservation.id);
    try {
      await reservationsApi.updateStatus(reservation.id, status);
      await qc.invalidateQueries({ queryKey: ['reservations'] });
      if (selected?.id === reservation.id) setSelected(prev => prev ? { ...prev, status } : null);
    } finally {
      setUpdating(null);
    }
  }

  async function assignTable(tableId: string) {
    if (!selected) return;
    await reservationsApi.update(selected.id, { tableId });
    await qc.invalidateQueries({ queryKey: ['reservations'] });
    setSelected(prev => prev ? { ...prev, tableId } : null);
  }

  return (
    <div className="min-h-full bg-paper px-4 py-5 pb-24">
      <div className="mb-4">
        <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-semibold">
          Service
        </p>
        <h2 className="font-display text-ink text-2xl font-normal">Reservierungen</h2>
        <p className="text-xs text-ink2 mt-1">Schnelle Bestätigung ohne Wischgesten.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/70 animate-pulse" />)}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-3xl border border-diwan-gold/10 bg-white px-5 py-12 text-center">
          <CalendarDays className="mx-auto text-diwan-gold mb-3" size={28} />
          <p className="font-semibold text-ink">Keine offenen Reservierungen</p>
          <p className="mt-1 text-xs text-ink2">Neue Anfragen erscheinen hier automatisch.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {upcoming.map((res, index) => {
              const sc = STATUS[res.status];
              return (
                <motion.article
                  key={res.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ ...springs.gentle, delay: index * 0.025 }}
                  className="rounded-3xl border border-diwan-gold/10 bg-white p-4 shadow-warm-sm"
                >
                  <button type="button" onClick={() => setSelected(res)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-ink">{res.name}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink2">
                          <span className="inline-flex items-center gap-1"><Clock size={12} /> {dateLabel(res)} · {res.time}</span>
                          <span className="inline-flex items-center gap-1"><Users size={12} /> {res.guests} Pers.</span>
                        </div>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', sc.bg, sc.text)}>
                        {sc.label}
                      </span>
                    </div>
                    {res.specialRequests && (
                      <p className="mt-3 line-clamp-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {res.specialRequests}
                      </p>
                    )}
                  </button>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={res.status !== 'PENDING' || updating === res.id}
                      onClick={() => changeStatus(res, 'CONFIRMED')}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-green-600 text-sm font-bold text-white disabled:opacity-40"
                    >
                      <Check size={16} /> Bestätigen
                    </button>
                    <button
                      type="button"
                      disabled={res.status === 'CANCELLED' || updating === res.id}
                      onClick={() => changeStatus(res, 'CANCELLED')}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-50 text-sm font-bold text-red-700 disabled:opacity-40"
                    >
                      <X size={16} /> Absagen
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <BottomSheet isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Reservierung">
        {selected && (
          <div className="px-5 pb-8 space-y-5">
            <div>
              <p className="text-xl font-bold text-ink">{selected.name}</p>
              <p className="text-sm text-ink2">{dateLabel(selected)} · {selected.time} · {selected.guests} Personen</p>
            </div>
            <div className="grid gap-3">
              <a href={`tel:${selected.phone ?? ''}`} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-sm text-ink">
                <Phone size={15} className="text-diwan-gold" /> {selected.phone || 'Keine Telefonnummer'}
              </a>
              <a href={`mailto:${selected.email}`} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-sm text-ink">
                <Mail size={15} className="text-diwan-gold" /> {selected.email || 'Keine E-Mail'}
              </a>
              {selected.specialRequests && (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <MessageSquare size={15} className="mt-0.5 text-amber-600" /> {selected.specialRequests}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink2/60">Tisch zuweisen</p>
              <div className="grid grid-cols-4 gap-2">
                {tables
                  .filter(t => t.status === 'AVAILABLE' || t.id === selected.tableId)
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => assignTable(t.id)}
                      className={cn(
                        'h-12 rounded-2xl border text-xs font-bold',
                        selected.tableId === t.id
                          ? 'border-diwan-gold bg-diwan-gold text-diwan-bg'
                          : 'border-diwan-gold/15 bg-white text-ink',
                      )}
                    >
                      {t.number}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
