import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Save } from 'lucide-react';
import { teamApi } from '@/lib/api';
import { cn, springs, getInitials, ROLE_LABELS } from '@/lib/utils';
import type { TeamMember, Role } from '@/types';

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const ROLE_COLORS: Record<Role, string> = {
  OWNER:   'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  WAITER:  'bg-amber-100 text-amber-700',
  KITCHEN: 'bg-red-100 text-red-600',
};

function getWeekStart(offset = 0): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}

function shiftKey(weekStart: Date, memberId: string, dayIdx: number): string {
  return `diwan_hr_${weekKey(weekStart)}_${memberId}_${dayIdx}`;
}

function loadShift(weekStart: Date, memberId: string, dayIdx: number): string {
  return localStorage.getItem(shiftKey(weekStart, memberId, dayIdx)) ?? '';
}

function saveShift(weekStart: Date, memberId: string, dayIdx: number, value: string) {
  const key = shiftKey(weekStart, memberId, dayIdx);
  if (value) localStorage.setItem(key, value);
  else       localStorage.removeItem(key);
}

function ShiftCell({ weekStart, member, dayIdx }: { weekStart: Date; member: TeamMember; dayIdx: number }) {
  const [value, setValue] = useState(() => loadShift(weekStart, member.id, dayIdx));
  const [dirty, setDirty] = useState(false);

  function commit(v: string) {
    saveShift(weekStart, member.id, dayIdx, v);
    setDirty(false);
  }

  const isEmpty = !value;
  const today = new Date();
  const cellDate = new Date(weekStart);
  cellDate.setDate(cellDate.getDate() + dayIdx);
  const isToday = cellDate.toDateString() === today.toDateString();

  return (
    <div className={cn('relative group', isToday && 'ring-1 ring-diwan-gold/30 rounded-lg')}>
      <input
        value={value}
        onChange={e => { setValue(e.target.value); setDirty(true); }}
        onBlur={() => dirty && commit(value)}
        onKeyDown={e => e.key === 'Enter' && commit(value)}
        placeholder={isEmpty ? '—' : undefined}
        className={cn(
          'w-full text-center text-[11px] rounded-lg px-1 py-2 border transition-all outline-none',
          'focus:ring-2 focus:ring-diwan-gold/25 focus:border-diwan-gold/40',
          isEmpty
            ? 'bg-transparent border-transparent text-ink2/30 placeholder-ink2/20 hover:border-diwan-gold/15 hover:bg-paper'
            : 'bg-white border-diwan-gold/15 text-ink font-medium',
        )}
      />
      {dirty && (
        <button
          onClick={() => commit(value)}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-diwan-gold flex items-center justify-center opacity-0 group-focus-within:opacity-100 transition-opacity"
        >
          <Save size={8} className="text-diwan-bg" />
        </button>
      )}
    </div>
  );
}

export function HR() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStart(weekOffset);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn:  teamApi.list,
  });

  const activeMembers = members.filter(m => m.isActive);

  // Build 7 date headers
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  const weekLabel = weekStart.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) + ' – ' +
    dates[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  const clearWeek = useCallback(() => {
    if (!confirm('Alle Schichten dieser Woche löschen?')) return;
    activeMembers.forEach(m => {
      for (let d = 0; d < 7; d++) localStorage.removeItem(shiftKey(weekStart, m.id, d));
    });
    window.location.reload();
  }, [activeMembers, weekStart]);

  return (
    <div className="p-6 space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">Planung</p>
          <h2 className="font-display text-ink text-2xl font-normal">Team & Schichten</h2>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink2 hidden sm:block">{weekLabel}</p>
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-paper2 transition-colors text-ink2"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={cn('px-3 h-8 rounded-xl text-xs font-semibold transition-all', weekOffset === 0 ? 'bg-diwan-gold text-diwan-bg' : 'bg-paper2 text-ink2 hover:bg-paper')}
          >
            Heute
          </button>
          <button
            onClick={() => setWeekOffset(v => v + 1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-paper2 transition-colors text-ink2"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>

      <p className="text-xs text-ink2 sm:hidden">{weekLabel}</p>

      {/* Usage hint */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-diwan-gold/6 border border-diwan-gold/15">
        <Clock size={12} className="text-diwan-gold flex-shrink-0" />
        <p className="text-[11px] text-ink2">Schichtzeiten eingeben, z.B. <span className="font-mono text-ink">10:00–18:00</span> oder <span className="font-mono text-ink">FREI</span>. Eingaben werden sofort gespeichert.</p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-paper2 animate-pulse" />)}</div>
      ) : activeMembers.length === 0 ? (
        <div className="text-center py-20 text-ink2 text-sm">Keine aktiven Mitarbeiter</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '160px repeat(7, 1fr)' }}>
              <div /> {/* staff name column */}
              {dates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <div key={i} className={cn('text-center rounded-lg py-1.5 px-1', isToday ? 'bg-diwan-gold/15' : 'bg-paper2/50')}>
                    <p className={cn('text-[10px] font-bold uppercase tracking-wide', isToday ? 'text-diwan-gold' : 'text-ink2/60')}>
                      {DAY_LABELS[i]}
                    </p>
                    <p className={cn('text-xs font-semibold', isToday ? 'text-diwan-gold' : 'text-ink2')}>
                      {d.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Member rows */}
            <div className="space-y-1">
              {activeMembers.map((m, mi) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springs.gentle, delay: mi * 0.04 }}
                  className="grid gap-1 items-center"
                  style={{ gridTemplateColumns: '160px repeat(7, 1fr)' }}
                >
                  {/* Name cell */}
                  <div className="flex items-center gap-2.5 pr-2">
                    <div className="w-7 h-7 rounded-full bg-diwan-gold/15 flex items-center justify-center text-diwan-gold text-[10px] font-bold flex-shrink-0">
                      {getInitials(m.displayName ?? m.username)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{m.displayName ?? m.username}</p>
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', ROLE_COLORS[m.role])}>
                        {ROLE_LABELS[m.role]}
                      </span>
                    </div>
                  </div>

                  {/* Day cells */}
                  {dates.map((_, di) => (
                    <ShiftCell key={di} weekStart={weekStart} member={m} dayIdx={di} />
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeMembers.length > 0 && (
        <div className="flex justify-end pt-2">
          <button
            onClick={clearWeek}
            className="text-xs text-ink2/50 hover:text-red-500 transition-colors"
          >
            Woche leeren
          </button>
        </div>
      )}
    </div>
  );
}
