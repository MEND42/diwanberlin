import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, Users, CalendarDays, Clock, Phone, Mail,
  ChevronRight, UtensilsCrossed, Wine, Cake, Mic2,
  Flower2, FileText, type LucideIcon,
} from 'lucide-react';
import { eventsApi } from '@/lib/api';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { cn, springs } from '@/lib/utils';
import type { EventInquiry, EventStatus } from '@/types';

const STATUS_META: Record<EventStatus, {
  label: string; bg: string; text: string;
  next?: EventStatus; nextLabel?: string;
}> = {
  PENDING:   { label: 'Ausstehend', bg: 'bg-amber-100',  text: 'text-amber-700',  next: 'REVIEWED',  nextLabel: 'Als gesehen markieren' },
  REVIEWED:  { label: 'Gesehen',    bg: 'bg-blue-100',   text: 'text-blue-700',   next: 'QUOTED',    nextLabel: 'Angebot gesendet' },
  QUOTED:    { label: 'Angeboten',  bg: 'bg-purple-100', text: 'text-purple-700', next: 'CONFIRMED', nextLabel: 'Bestätigen' },
  CONFIRMED: { label: 'Bestätigt', bg: 'bg-green-100',  text: 'text-green-700' },
  CANCELLED: { label: 'Abgelehnt', bg: 'bg-red-100',    text: 'text-red-600' },
};

const PIPELINE: EventStatus[] = ['PENDING', 'REVIEWED', 'QUOTED', 'CONFIRMED'];

type StatusFilter = 'all' | EventStatus;
const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'Alle' },
  { key: 'PENDING',   label: 'Ausstehend' },
  { key: 'REVIEWED',  label: 'Gesehen' },
  { key: 'QUOTED',    label: 'Angeboten' },
  { key: 'CONFIRMED', label: 'Bestätigt' },
];

function DetailRow({ icon: Icon, label, value }: {
  icon: LucideIcon;
  label: string; value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-paper2 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={12} className="text-ink2" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-ink2/60 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-ink break-words">{value}</p>
      </div>
    </div>
  );
}

export function Events() {
  const qc = useQueryClient();
  const [filter,   setFilter]   = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<EventInquiry | null>(null);
  const [updating, setUpdating] = useState(false);

  const { data: inquiries = [], isLoading } = useQuery<EventInquiry[]>({
    queryKey: ['events-inquiries'],
    queryFn:  eventsApi.inquiries,
    refetchInterval: 30_000,
  });

  const filtered = filter === 'all'
    ? inquiries
    : inquiries.filter(e => e.status === filter);

  const pending = inquiries.filter(e => e.status === 'PENDING').length;

  async function advance(id: string, status: EventStatus) {
    setUpdating(true);
    try {
      await eventsApi.updateStatus(id, status);
      qc.invalidateQueries({ queryKey: ['events-inquiries'] });
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">
          {pending > 0 ? `${pending} neue Anfragen` : 'Aktuell'}
        </p>
        <h2 className="font-display text-ink text-2xl font-normal">Event-Anfragen</h2>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(({ key, label }) => (
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
            {key === 'PENDING' && pending > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-paper2 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-diwan-gold/10 flex items-center justify-center mb-4">
            <Ticket size={24} className="text-diwan-gold" />
          </div>
          <p className="font-semibold text-ink mb-1">Keine Anfragen</p>
          <p className="text-xs text-ink2">in dieser Kategorie</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((ev, i) => {
              const sm = STATUS_META[ev.status];
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ ...springs.gentle, delay: i * 0.03 }}
                >
                  <button
                    onClick={() => setSelected(ev)}
                    className="w-full flex items-center gap-4 px-4 py-4 bg-white border border-diwan-gold/8 rounded-2xl text-left hover:border-diwan-gold/20 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-diwan-gold/10 flex items-center justify-center flex-shrink-0">
                      <Ticket size={16} className="text-diwan-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-ink truncate">{ev.name}</p>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', sm.bg, sm.text)}>
                          {sm.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-ink2 flex-wrap">
                        <span className="flex items-center gap-1"><CalendarDays size={9} /> {ev.eventDate}</span>
                        <span className="flex items-center gap-1"><Users size={9} /> {ev.numberOfPeople} Pers.</span>
                        <span className="text-ink2/60">{ev.eventType}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-ink2/40 flex-shrink-0" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Detail BottomSheet */}
      <BottomSheet isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Event-Anfrage">
        {selected && (() => {
          const sm = STATUS_META[selected.status];
          const pipelineIdx = PIPELINE.indexOf(selected.status);
          return (
            <div className="px-5 pb-8 space-y-5">
              {/* Status pipeline */}
              <div className="flex items-center gap-1 flex-wrap">
                {PIPELINE.map((s, idx) => {
                  const isActive  = selected.status === s;
                  const isPast    = pipelineIdx > idx;
                  const isCancelled = selected.status === 'CANCELLED';
                  return (
                    <div key={s} className="flex items-center gap-1">
                      <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        isCancelled ? 'bg-red-400' :
                        isPast || isActive ? 'bg-diwan-gold' : 'bg-paper2 border border-diwan-gold/20',
                      )} />
                      <span className={cn(
                        'text-[10px] font-semibold',
                        isActive ? 'text-diwan-gold' : isPast ? 'text-ink2' : 'text-ink2/40',
                      )}>
                        {STATUS_META[s].label}
                      </span>
                      {idx < PIPELINE.length - 1 && (
                        <div className={cn('h-px w-5 mx-1 flex-shrink-0', isPast ? 'bg-diwan-gold/60' : 'bg-paper2')} />
                      )}
                    </div>
                  );
                })}
                {selected.status === 'CANCELLED' && (
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full ml-2', sm.bg, sm.text)}>
                    {sm.label}
                  </span>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-2.5">
                <DetailRow icon={Users}      label="Name"        value={selected.name} />
                <DetailRow icon={Mail}       label="E-Mail"      value={selected.email} />
                <DetailRow icon={Phone}      label="Telefon"     value={selected.phone} />
                <DetailRow icon={CalendarDays} label="Datum"     value={selected.eventDate} />
                <DetailRow icon={Clock}      label="Zeitraum"    value={selected.eventTiming} />
                <DetailRow icon={Users}      label="Personen"    value={`${selected.numberOfPeople} Personen`} />
                <DetailRow icon={Ticket}     label="Art"         value={selected.eventType} />
              </div>

              {/* Extras */}
              {(selected.drinks || selected.food || selected.cakes || selected.equipment || selected.decor || selected.otherNotes) && (
                <div className="rounded-xl bg-paper border border-diwan-gold/10 p-4 space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink2 mb-3">Anforderungen</p>
                  <DetailRow icon={Wine}            label="Getränke"   value={selected.drinks} />
                  <DetailRow icon={UtensilsCrossed} label="Essen"      value={selected.food} />
                  <DetailRow icon={Cake}            label="Torten"     value={selected.cakes} />
                  <DetailRow icon={Mic2}            label="Equipment"  value={selected.equipment} />
                  <DetailRow icon={Flower2}         label="Dekoration" value={selected.decor} />
                  <DetailRow icon={FileText}        label="Sonstiges"  value={selected.otherNotes} />
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                {sm.next && (
                  <button
                    onClick={() => advance(selected.id, sm.next!)}
                    disabled={updating}
                    className="w-full py-3 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 disabled:opacity-50 transition-colors"
                  >
                    {sm.nextLabel}
                  </button>
                )}
                {selected.status !== 'CANCELLED' && selected.status !== 'CONFIRMED' && (
                  <button
                    onClick={() => advance(selected.id, 'CANCELLED')}
                    disabled={updating}
                    className="w-full py-3 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    Anfrage ablehnen
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
}
