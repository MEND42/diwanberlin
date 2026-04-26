import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Check, X, Clock, Users, Phone,
  Mail, ChevronRight, MessageSquare, Trash2, type LucideIcon,
} from 'lucide-react';
import { reservationsApi, tablesApi } from '@/lib/api';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { SwipeRow } from '@/components/primitives/SwipeRow';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { cn, springs } from '@/lib/utils';
import type { Reservation, Table } from '@/types';

const STATUS = {
  PENDING:   { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Ausstehend' },
  CONFIRMED: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Bestätigt'  },
  CANCELLED: { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Storniert'  },
} as const;

type DateFilter = 'today' | 'tomorrow' | 'week' | 'all';

const FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today',    label: 'Heute' },
  { key: 'tomorrow', label: 'Morgen' },
  { key: 'week',     label: '7 Tage' },
  { key: 'all',      label: 'Alle' },
];

function applyDateFilter(list: Reservation[], f: DateFilter): Reservation[] {
  const now      = new Date();
  const ymd      = (d: Date) => d.toISOString().slice(0, 10);
  const today    = ymd(now);
  const tomorrow = ymd(new Date(+now + 864e5));
  const weekEnd  = ymd(new Date(+now + 7 * 864e5));
  return list.filter(r => {
    const d = r.date.slice(0, 10);
    if (f === 'today')    return d === today;
    if (f === 'tomorrow') return d === tomorrow;
    if (f === 'week')     return d >= today && d <= weekEnd;
    return true;
  });
}

function InfoRow({ icon: Icon, label, value }: {
  icon: LucideIcon;
  label: string; value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-paper2 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-ink2" />
      </div>
      <div>
        <p className="text-[10px] text-ink2/60 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-ink">{value}</p>
      </div>
    </div>
  );
}

export function Reservations() {
  const qc = useQueryClient();
  const [filter,   setFilter]   = useState<DateFilter>('today');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations'],
    queryFn:  reservationsApi.list,
    refetchInterval: 30_000,
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn:  tablesApi.list,
  });

  const filtered = applyDateFilter(reservations, filter);
  const pending  = reservations.filter(r => r.status === 'PENDING').length;

  async function changeStatus(id: string, status: string) {
    setUpdating(true);
    try {
      await reservationsApi.updateStatus(id, status);
      qc.invalidateQueries({ queryKey: ['reservations'] });
      setSelected(null);
    } finally {
      setUpdating(false);
    }
  }

  async function assignTable(tableId: string) {
    if (!selected) return;
    await reservationsApi.update(selected.id, { tableId });
    qc.invalidateQueries({ queryKey: ['reservations'] });
    setSelected(prev => prev ? { ...prev, tableId } : null);
  }

  async function deleteReservation() {
    if (!deleteTarget) return;
    setUpdating(true);
    try {
      await reservationsApi.delete(deleteTarget.id);
      await qc.invalidateQueries({ queryKey: ['reservations'] });
      setSelected(null);
      setDeleteTarget(null);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">
          {pending > 0 ? `${pending} ausstehend` : 'Aktuell'}
        </p>
        <h2 className="font-display text-ink text-2xl font-normal">Reservierungen</h2>
      </motion.div>

      {/* Date tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              filter === key
                ? 'bg-diwan-gold text-diwan-bg shadow-sm'
                : 'bg-white text-ink2 border border-diwan-gold/10 hover:border-diwan-gold/25',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-paper2 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-diwan-gold/10 flex items-center justify-center mb-4">
            <CalendarDays size={24} className="text-diwan-gold" />
          </div>
          <p className="font-semibold text-ink mb-1">Keine Reservierungen</p>
          <p className="text-xs text-ink2">für diesen Zeitraum</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((res, i) => {
              const sc = STATUS[res.status];
              return (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ ...springs.gentle, delay: i * 0.03 }}
                >
                  <SwipeRow
                    leftAction={res.status === 'PENDING' ? {
                      label: 'Bestätigen', icon: <Check size={18} />,
                      color: '#166534', bg: '#dcfce7',
                      onAction: () => changeStatus(res.id, 'CONFIRMED'),
                    } : undefined}
                    rightAction={res.status !== 'CANCELLED' ? {
                      label: 'Stornieren', icon: <X size={18} />,
                      color: '#991b1b', bg: '#fee2e2',
                      onAction: () => changeStatus(res.id, 'CANCELLED'),
                    } : undefined}
                  >
                    <button
                      onClick={() => setSelected(res)}
                      className="w-full flex items-center gap-4 px-4 py-3.5 bg-white border border-diwan-gold/8 rounded-2xl text-left hover:border-diwan-gold/20 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-diwan-gold/10 flex items-center justify-center flex-shrink-0">
                        <Users size={16} className="text-diwan-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-ink truncate">{res.name}</p>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', sc.bg, sc.text)}>
                            {sc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-ink2">
                          <span className="flex items-center gap-1">
                            <Clock size={9} /> {res.date} · {res.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={9} /> {res.guests} Pers.
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-ink2/40 flex-shrink-0" />
                    </button>
                  </SwipeRow>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Detail BottomSheet */}
      <BottomSheet isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Reservierung">
        {selected && (() => {
          const sc = STATUS[selected.status];
          return (
            <div className="px-5 pb-8 space-y-5">
              <span className={cn('inline-block text-xs font-bold px-3 py-1 rounded-full', sc.bg, sc.text)}>
                {sc.label}
              </span>

              <div className="space-y-3">
                <InfoRow icon={Users}         label="Name"        value={selected.name} />
                <InfoRow icon={Mail}          label="E-Mail"      value={selected.email || '—'} />
                <InfoRow icon={Phone}         label="Telefon"     value={selected.phone || '—'} />
                <InfoRow icon={Clock}         label="Datum & Zeit" value={`${selected.date} · ${selected.time}`} />
                <InfoRow icon={Users}         label="Personen"    value={`${selected.guests} Personen`} />
              </div>

              {selected.specialRequests && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageSquare size={12} className="text-amber-600" />
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Sonderwünsche</p>
                  </div>
                  <p className="text-sm text-amber-900">{selected.specialRequests}</p>
                </div>
              )}

              {/* Table picker */}
              <div>
                <p className="text-[10px] text-ink2/60 uppercase tracking-wide font-medium mb-2">Tisch zuweisen</p>
                <div className="flex flex-wrap gap-2">
                  {tables
                    .filter(t => t.status === 'AVAILABLE' || t.id === selected.tableId)
                    .map(t => (
                      <button
                        key={t.id}
                        onClick={() => assignTable(t.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                          selected.tableId === t.id
                            ? 'bg-diwan-gold text-diwan-bg border-diwan-gold'
                            : 'bg-white text-ink2 border-diwan-gold/15 hover:border-diwan-gold/30',
                        )}
                      >
                        Tisch {t.number} ({t.seats} Pl.)
                      </button>
                    ))}
                  {tables.filter(t => t.status === 'AVAILABLE' || t.id === selected.tableId).length === 0 && (
                    <p className="text-xs text-ink2">Keine freien Tische verfügbar</p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {selected.status === 'PENDING' && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => changeStatus(selected.id, 'CONFIRMED')}
                    disabled={updating}
                    className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={15} /> Bestätigen
                  </button>
                  <button
                    onClick={() => changeStatus(selected.id, 'CANCELLED')}
                    disabled={updating}
                    className="flex-1 py-3 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={15} /> Stornieren
                  </button>
                </div>
              )}
              {selected.status === 'CONFIRMED' && (
                <button
                  onClick={() => changeStatus(selected.id, 'CANCELLED')}
                  disabled={updating}
                  className="w-full py-3 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  Reservierung stornieren
                </button>
              )}
              <button
                onClick={() => setDeleteTarget(selected)}
                disabled={updating}
                className="w-full py-3 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={15} /> Reservierung löschen
              </button>
            </div>
          );
        })()}
      </BottomSheet>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Reservierung löschen?"
        description={deleteTarget ? `${deleteTarget.name} · ${deleteTarget.date} ${deleteTarget.time} wird dauerhaft entfernt.` : ''}
        loading={updating}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteReservation}
      />
    </div>
  );
}
