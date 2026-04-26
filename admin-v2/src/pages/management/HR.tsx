import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock,
  LogIn, LogOut, Plus, TimerReset, User, Users, X
} from 'lucide-react';
import { hrApi, teamApi } from '@/lib/api';
import { cn, getInitials, ROLE_LABELS, springs } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import type { Role, ShiftAssignment, StaffAvailability, StaffProfile, TeamMember, TimeEntry } from '@/types';

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const COVERAGE_SLOTS = [
  { key: 'morning', label: 'Früh', time: '07:00–12:00', start: '07:00', end: '12:00' },
  { key: 'midday', label: 'Mitte', time: '12:00–17:00', start: '12:00', end: '17:00' },
  { key: 'evening', label: 'Abend', time: '17:00–21:00', start: '17:00', end: '21:00' },
];

type TabId = 'today' | 'schedule' | 'availability' | 'time';
type StaffMember = TeamMember & { staffProfile?: StaffProfile };

const ROLE_STYLES: Record<Role, string> = {
  OWNER: 'bg-purple-100 text-purple-800 border-purple-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  WAITER: 'bg-amber-100 text-amber-800 border-amber-200',
  KITCHEN: 'bg-red-100 text-red-800 border-red-200',
};

function getWeekStart(offset = 0): Date {
  const date = new Date();
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function displayName(member?: Pick<TeamMember, 'username' | 'displayName'> & { staffProfile?: StaffProfile }) {
  return member?.staffProfile?.fullName || member?.displayName || member?.username || 'Mitarbeiter';
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function shiftOverlaps(shift: ShiftAssignment, slot: { start: string; end: string }) {
  return shift.startTime < slot.end && shift.endTime > slot.start;
}

function hoursBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function entryHours(entry: TimeEntry) {
  if (!entry.clockOut) return 0;
  const minutes = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 60000;
  return Math.max(0, (minutes - (entry.breakMinutes || 0)) / 60);
}

function StaffBadge({ member }: { member: StaffMember }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-diwan-gold/15 text-sm font-bold text-diwan-gold">
        {getInitials(displayName(member))}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink">{displayName(member)}</p>
        <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold', ROLE_STYLES[member.role])}>
          {ROLE_LABELS[member.role]}
        </span>
      </div>
    </div>
  );
}

function PageTabs({ active, onChange, canManage, pendingCount }: {
  active: TabId;
  onChange: (tab: TabId) => void;
  canManage: boolean;
  pendingCount: number;
}) {
  const tabs = [
    { id: 'today' as const, label: 'Heute', icon: Clock },
    { id: 'schedule' as const, label: 'Schichtplan', icon: CalendarDays },
    { id: 'availability' as const, label: canManage ? 'Vorschläge' : 'Meine Zeiten', icon: Users, badge: pendingCount },
    { id: 'time' as const, label: 'Zeiterfassung', icon: TimerReset },
  ];

  return (
    <div className="grid gap-2 rounded-2xl border border-diwan-gold/12 bg-white p-1 shadow-sm sm:inline-grid sm:grid-flow-col">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all',
              selected ? 'bg-diwan-gold text-diwan-bg shadow-sm' : 'text-ink2 hover:bg-paper2 hover:text-ink'
            )}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
            {!!tab.badge && (
              <span className={cn('rounded-full px-2 py-0.5 text-[11px]', selected ? 'bg-diwan-bg/15' : 'bg-red-100 text-red-700')}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CoverageSummary({ shifts, weekStart, onAddShift, canManage }: {
  shifts: ShiftAssignment[];
  weekStart: Date;
  onAddShift: () => void;
  canManage: boolean;
}) {
  const missing = [];

  for (let day = 1; day <= 7; day += 1) {
    const dayShifts = shifts.filter(s => s.dayOfWeek === day && s.status === 'APPROVED');
    for (const slot of COVERAGE_SLOTS) {
      if (dayShifts.filter(shift => shiftOverlaps(shift, slot)).length < 1) {
        missing.push({ day, ...slot });
      }
    }
  }

  const todayDay = new Date().getDay() || 7;
  const todayMissing = missing.filter(item => item.day === todayDay).length;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr]">
      <div className="rounded-2xl border border-diwan-gold/12 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Heute</p>
        <p className={cn('mt-2 text-3xl font-bold', todayMissing ? 'text-red-700' : 'text-green-700')}>
          {todayMissing}
        </p>
        <p className="text-sm font-semibold text-ink2">{todayMissing === 1 ? 'offene Zeit' : 'offene Zeiten'}</p>
      </div>
      <div className="rounded-2xl border border-diwan-gold/12 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Diese Woche</p>
        <p className={cn('mt-2 text-3xl font-bold', missing.length ? 'text-red-700' : 'text-green-700')}>
          {missing.length}
        </p>
        <p className="text-sm font-semibold text-ink2">{missing.length ? 'offene Zeitfenster' : 'vollständig besetzt'}</p>
      </div>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle size={16} />
              <p className="text-sm font-bold">Deckung prüfen</p>
            </div>
            <p className="mt-1 text-sm text-red-800/85">
              {missing.length
                ? `${DAY_LABELS[missing[0].day - 1]} ${missing[0].time} ist als nächstes offen.`
                : 'Alle Kernzeiten von 07:00 bis 21:00 sind abgedeckt.'}
            </p>
          </div>
          {canManage && missing.length > 0 && (
            <button onClick={onAddShift} className="shrink-0 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white">
              Besetzen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeClockCard({ entries, currentUserId, onClockIn, onClockOut, pending }: {
  entries: TimeEntry[];
  currentUserId: string;
  onClockIn: () => void;
  onClockOut: (id: string) => void;
  pending: boolean;
}) {
  const openEntry = entries.find(entry => entry.status === 'OPEN' && entry.adminUserId === currentUserId);
  const todayEntries = entries.filter(entry => sameDay(new Date(entry.clockIn), new Date()));
  const todayHours = todayEntries.reduce((sum, entry) => sum + entryHours(entry), 0);

  return (
    <div className="rounded-3xl border border-diwan-gold/12 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-diwan-gold">Zeiterfassung</p>
          <h3 className="mt-1 font-display text-2xl text-ink">{openEntry ? 'Du bist eingestempelt' : 'Bereit für die Schicht'}</h3>
          <p className="mt-1 text-sm font-medium text-ink2">
            Heute erfasst: <span className="font-bold text-ink">{todayHours.toFixed(1)} Std.</span>
          </p>
        </div>
        {!openEntry ? (
          <button
            onClick={onClockIn}
            disabled={pending}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-green-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            <LogIn size={18} /> Einstempeln
          </button>
        ) : (
          <button
            onClick={() => onClockOut(openEntry.id)}
            disabled={pending}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            <LogOut size={18} /> Ausstempeln
          </button>
        )}
      </div>
    </div>
  );
}

function TodayView({ dates, shifts, members, currentUser, canManage, timeEntries, onClockIn, onClockOut, clockPending }: {
  dates: Date[];
  shifts: ShiftAssignment[];
  members: StaffMember[];
  currentUser?: { id: string } | null;
  canManage: boolean;
  timeEntries: TimeEntry[];
  onClockIn: () => void;
  onClockOut: (id: string) => void;
  clockPending: boolean;
}) {
  const todayIndex = Math.max(0, dates.findIndex(date => sameDay(date, new Date())));
  const dayNumber = todayIndex + 1;
  const todayShifts = shifts.filter(shift => shift.dayOfWeek === dayNumber && shift.status === 'APPROVED');
  const visibleShifts = canManage ? todayShifts : todayShifts.filter(shift => shift.adminUserId === currentUser?.id);

  return (
    <div className="space-y-5">
      <TimeClockCard
        entries={timeEntries}
        currentUserId={currentUser?.id || ''}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
        pending={clockPending}
      />

      <div className="rounded-3xl border border-diwan-gold/12 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Heute</p>
            <h3 className="mt-1 font-display text-2xl text-ink">
              {DAY_LABELS[todayIndex]} · {dates[todayIndex]?.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
            </h3>
          </div>
          <span className="rounded-full bg-diwan-gold/12 px-3 py-1 text-sm font-bold text-diwan-gold">
            {visibleShifts.length} Schichten
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {COVERAGE_SLOTS.map(slot => {
            const slotShifts = todayShifts.filter(shift => shiftOverlaps(shift, slot));
            return (
              <div key={slot.key} className={cn(
                'rounded-2xl border p-4',
                slotShifts.length ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              )}>
                <p className={cn('text-sm font-bold', slotShifts.length ? 'text-green-800' : 'text-red-800')}>
                  {slot.label} · {slot.time}
                </p>
                <div className="mt-3 space-y-2">
                  {slotShifts.length ? slotShifts.map(shift => (
                    <p key={shift.id} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-ink">
                      {displayName(shift.adminUser)} <span className="font-medium text-ink2">({shift.startTime}–{shift.endTime})</span>
                    </p>
                  )) : (
                    <p className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-700">Offen</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!canManage && (
        <div className="rounded-3xl border border-diwan-gold/12 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Meine heutige Schicht</p>
          <div className="mt-4 space-y-3">
            {visibleShifts.length ? visibleShifts.map(shift => (
              <div key={shift.id} className="rounded-2xl bg-paper p-4">
                <p className="text-lg font-bold text-ink">{shift.startTime}–{shift.endTime}</p>
                <p className="text-sm font-medium text-ink2">Geplante Arbeitszeit: {hoursBetween(shift.startTime, shift.endTime).toFixed(1)} Std.</p>
              </div>
            )) : (
              <p className="rounded-2xl bg-paper p-4 text-sm font-semibold text-ink2">Heute ist keine Schicht geplant.</p>
            )}
          </div>
        </div>
      )}

      {canManage && (
        <div className="rounded-3xl border border-diwan-gold/12 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Team heute</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {members.map(member => {
              const memberShifts = todayShifts.filter(shift => shift.adminUserId === member.id);
              return (
                <div key={member.id} className="rounded-2xl border border-diwan-gold/10 bg-paper p-4">
                  <StaffBadge member={member} />
                  <div className="mt-3 space-y-2">
                    {memberShifts.length ? memberShifts.map(shift => (
                      <p key={shift.id} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-ink">
                        {shift.startTime}–{shift.endTime}
                      </p>
                    )) : (
                      <p className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink2">Keine Schicht</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleView({ dates, shifts, members, canManage, onAddShift, onDeleteShift }: {
  dates: Date[];
  shifts: ShiftAssignment[];
  members: StaffMember[];
  canManage: boolean;
  onAddShift: () => void;
  onDeleteShift: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Wochenplan</p>
          <p className="mt-1 text-sm font-medium text-ink2">Klar nach Tagen gruppiert. Leere Zeiten sind sichtbar als “Offen”.</p>
        </div>
        {canManage && (
          <button onClick={onAddShift} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-diwan-gold px-4 text-sm font-bold text-diwan-bg">
            <Plus size={16} /> Schicht eintragen
          </button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        {dates.map((date, index) => {
          const dayShifts = shifts.filter(shift => shift.dayOfWeek === index + 1 && shift.status === 'APPROVED');
          return (
            <section key={date.toISOString()} className={cn(
              'rounded-3xl border bg-white p-4 shadow-sm',
              sameDay(date, new Date()) ? 'border-diwan-gold/40' : 'border-diwan-gold/12'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-diwan-gold">{DAY_LABELS[index]}</p>
                  <h3 className="text-lg font-bold text-ink">{date.getDate()}. {date.toLocaleDateString('de-DE', { month: 'short' })}</h3>
                </div>
                <span className="rounded-full bg-paper px-2 py-1 text-xs font-bold text-ink2">{dayShifts.length}</span>
              </div>

              <div className="mt-4 space-y-3">
                {COVERAGE_SLOTS.map(slot => {
                  const slotShifts = dayShifts.filter(shift => shiftOverlaps(shift, slot));
                  return (
                    <div key={slot.key} className="rounded-2xl bg-paper p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink2">{slot.label} · {slot.time}</p>
                      <div className="mt-2 space-y-2">
                        {slotShifts.length ? slotShifts.map(shift => (
                          <div key={shift.id} className="rounded-xl bg-white px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold text-ink">{displayName(shift.adminUser)}</p>
                                <p className="text-sm font-semibold text-diwan-gold">{shift.startTime}–{shift.endTime}</p>
                              </div>
                              {canManage && (
                                <button onClick={() => onDeleteShift(shift.id)} className="rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50">
                                  Entfernen
                                </button>
                              )}
                            </div>
                          </div>
                        )) : (
                          <p className="rounded-xl border border-dashed border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Offen</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AvailabilityView({ availability, canManage, onApprove, onReject, onOpenForm }: {
  availability: StaffAvailability[];
  canManage: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOpenForm: () => void;
}) {
  const pending = availability.filter(item => item.status === 'PENDING');
  const other = availability.filter(item => item.status !== 'PENDING');

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-diwan-gold/12 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-diwan-gold">{canManage ? 'Offene Vorschläge' : 'Meine vorgeschlagenen Zeiten'}</p>
            <h3 className="mt-1 font-display text-2xl text-ink">{pending.length} wartet</h3>
          </div>
          <button onClick={onOpenForm} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-diwan-gold px-4 text-sm font-bold text-diwan-bg">
            <Plus size={16} /> Zeit vorschlagen
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {pending.length ? pending.map(item => (
            <div key={item.id} className="rounded-2xl border border-diwan-gold/12 bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">{displayName(item.adminUser)}</p>
                  <p className="text-lg font-bold text-diwan-gold">{DAY_LABELS[item.dayOfWeek - 1]} · {item.startTime}–{item.endTime}</p>
                  {item.note && <p className="mt-1 text-sm font-medium text-ink2">{item.note}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button onClick={() => onApprove(item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-green-600 px-3 text-sm font-bold text-white">
                      <Check size={15} /> Freigeben
                    </button>
                    <button onClick={() => onReject(item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-bold text-white">
                      <X size={15} /> Ablehnen
                    </button>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <p className="rounded-2xl bg-paper p-5 text-sm font-semibold text-ink2">Keine offenen Vorschläge.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-diwan-gold/12 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Verlauf</p>
        <div className="mt-4 space-y-2">
          {other.slice(0, 8).map(item => (
            <div key={item.id} className="rounded-2xl bg-paper p-3">
              <p className="text-sm font-bold text-ink">{DAY_LABELS[item.dayOfWeek - 1]} · {item.startTime}–{item.endTime}</p>
              <p className={cn(
                'mt-1 text-xs font-bold',
                item.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'
              )}>
                {item.status === 'APPROVED' ? 'Freigegeben' : 'Abgelehnt'}
              </p>
            </div>
          ))}
          {!other.length && <p className="text-sm font-semibold text-ink2">Noch kein Verlauf.</p>}
        </div>
      </div>
    </div>
  );
}

function TimeEntriesView({ entries, currentUserId, onClockIn, onClockOut, pending }: {
  entries: TimeEntry[];
  currentUserId: string;
  onClockIn: () => void;
  onClockOut: (id: string) => void;
  pending: boolean;
}) {
  const totals = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; entries: number }>();
    entries.forEach(entry => {
      const key = entry.adminUserId;
      const current = map.get(key) || { name: displayName(entry.adminUser), hours: 0, entries: 0 };
      current.hours += entryHours(entry);
      current.entries += 1;
      map.set(key, current);
    });
    return Array.from(map.entries());
  }, [entries]);

  return (
    <div className="space-y-5">
      <TimeClockCard
        entries={entries}
        currentUserId={currentUserId}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
        pending={pending}
      />

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-diwan-gold/12 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Wochenstunden</p>
          <div className="mt-4 space-y-3">
            {totals.length ? totals.map(([id, total]) => (
              <div key={id} className="rounded-2xl bg-paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-ink">{total.name}</p>
                  <p className="text-lg font-bold text-diwan-gold">{total.hours.toFixed(1)} Std.</p>
                </div>
                <p className="mt-1 text-sm font-medium text-ink2">{total.entries} Zeiteinträge</p>
              </div>
            )) : (
              <p className="rounded-2xl bg-paper p-4 text-sm font-semibold text-ink2">Noch keine Stunden in dieser Woche.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-diwan-gold/12 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink2">Letzte Einträge</p>
          <div className="mt-4 space-y-3">
            {entries.length ? entries.slice(0, 12).map(entry => (
              <div key={entry.id} className="rounded-2xl border border-diwan-gold/10 bg-paper p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{displayName(entry.adminUser)}</p>
                    <p className="text-sm font-semibold text-ink2">
                      {new Date(entry.clockIn).toLocaleDateString('de-DE')} · {new Date(entry.clockIn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      {entry.clockOut && ` – ${new Date(entry.clockOut).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <span className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold',
                    entry.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                      entry.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                  )}>
                    {entry.status === 'OPEN' ? 'Offen' : entry.status === 'SUBMITTED' ? 'Eingereicht' : 'Bestätigt'}
                  </span>
                </div>
              </div>
            )) : (
              <p className="rounded-2xl bg-paper p-4 text-sm font-semibold text-ink2">Keine Zeiteinträge.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShiftFormModal({ isOpen, onClose, staff, onSubmit }: {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember[];
  onSubmit: (data: { adminUserId: string; dayOfWeek: number; startTime: string; endTime: string }) => void;
}) {
  const [adminUserId, setAdminUserId] = useState(staff[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('12:00');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="font-display text-2xl text-ink">Schicht eintragen</h3>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ adminUserId, dayOfWeek, startTime, endTime });
            onClose();
          }}
        >
          <label className="block">
            <span className="text-sm font-bold text-ink">Mitarbeiter</span>
            <select value={adminUserId} onChange={event => setAdminUserId(event.target.value)} className="mt-1 w-full rounded-2xl border border-diwan-gold/20 bg-white px-4 py-3 text-base font-semibold text-ink">
              {staff.map(member => <option key={member.id} value={member.id}>{displayName(member)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">Tag</span>
            <select value={dayOfWeek} onChange={event => setDayOfWeek(Number(event.target.value))} className="mt-1 w-full rounded-2xl border border-diwan-gold/20 bg-white px-4 py-3 text-base font-semibold text-ink">
              {DAY_LABELS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-bold text-ink">Start</span>
              <input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} className="mt-1 w-full rounded-2xl border border-diwan-gold/20 bg-white px-4 py-3 text-base font-semibold text-ink" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">Ende</span>
              <input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} className="mt-1 w-full rounded-2xl border border-diwan-gold/20 bg-white px-4 py-3 text-base font-semibold text-ink" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="min-h-11 rounded-2xl px-4 text-sm font-bold text-ink2 hover:bg-paper2">Abbrechen</button>
            <button type="submit" disabled={!adminUserId} className="min-h-11 rounded-2xl bg-diwan-gold px-5 text-sm font-bold text-diwan-bg disabled:opacity-50">Speichern</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AvailabilityFormModal({ isOpen, onClose, staff, currentUserId, canManage, weekStart, onSubmit }: {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember[];
  currentUserId: string;
  canManage: boolean;
  weekStart: Date;
  onSubmit: (data: { adminUserId: string; dayOfWeek: number; startTime: string; endTime: string; weekStart: string }) => void;
}) {
  const [adminUserId, setAdminUserId] = useState(currentUserId);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('12:00');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="font-display text-2xl text-ink">Zeit vorschlagen</h3>
        <p className="mt-1 text-sm font-medium text-ink2">Diese Zeit wird dem Manager zur Freigabe angezeigt.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ adminUserId, dayOfWeek, startTime, endTime, weekStart: isoDate(weekStart) });
            onClose();
          }}
        >
          {canManage && (
            <label className="block">
              <span className="text-sm font-bold text-ink">Mitarbeiter</span>
              <select value={adminUserId} onChange={event => setAdminUserId(event.target.value)} className="mt-1 w-full rounded-2xl border border-diwan-gold/20 bg-white px-4 py-3 text-base font-semibold text-ink">
                {staff.map(member => <option key={member.id} value={member.id}>{displayName(member)}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-bold text-ink">Tag</span>
            <select value={dayOfWeek} onChange={event => setDayOfWeek(Number(event.target.value))} className="mt-1 w-full rounded-2xl border border-diwan-gold/20 bg-white px-4 py-3 text-base font-semibold text-ink">
              {DAY_LABELS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-bold text-ink">Start</span>
              <input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} className="mt-1 w-full rounded-2xl border border-diwan-gold/20 bg-white px-4 py-3 text-base font-semibold text-ink" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">Ende</span>
              <input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} className="mt-1 w-full rounded-2xl border border-diwan-gold/20 bg-white px-4 py-3 text-base font-semibold text-ink" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="min-h-11 rounded-2xl px-4 text-sm font-bold text-ink2 hover:bg-paper2">Abbrechen</button>
            <button type="submit" className="min-h-11 rounded-2xl bg-diwan-gold px-5 text-sm font-bold text-diwan-bg">Vorschlagen</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function HR() {
  const queryClient = useQueryClient();
  const currentUser = useAppStore(state => state.currentUser);
  const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER';
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [weekOffset, setWeekOffset] = useState(0);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);

  const weekStart = getWeekStart(weekOffset);
  const weekStartStr = isoDate(weekStart);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const weekLabel = `${weekStart.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })} – ${dates[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const { data: members = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: teamApi.list,
  });
  const { data: availability = [], isLoading: loadingAvailability } = useQuery<StaffAvailability[]>({
    queryKey: ['hr-availability', weekStartStr],
    queryFn: () => hrApi.getAvailability(weekStartStr),
  });
  const { data: shifts = [], isLoading: loadingShifts } = useQuery<ShiftAssignment[]>({
    queryKey: ['hr-shifts', weekStartStr],
    queryFn: () => hrApi.getShifts(weekStartStr),
  });
  const { data: timeEntries = [], isLoading: loadingTime } = useQuery<TimeEntry[]>({
    queryKey: ['hr-time-entries', weekStartStr],
    queryFn: () => hrApi.getTimeEntries(weekStartStr),
  });

  const createShift = useMutation({
    mutationFn: hrApi.createShift,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-shifts'] }),
  });
  const deleteShift = useMutation({
    mutationFn: hrApi.deleteShift,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-shifts'] }),
  });
  const createAvailability = useMutation({
    mutationFn: hrApi.submitAvailability,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-availability'] }),
  });
  const updateAvailability = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string } }) => hrApi.updateAvailability(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-availability'] }),
  });
  const clockIn = useMutation({
    mutationFn: hrApi.clockIn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-time-entries'] }),
  });
  const clockOut = useMutation({
    mutationFn: ({ id, breakMinutes }: { id: string; breakMinutes?: number }) => hrApi.clockOut(id, breakMinutes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-time-entries'] }),
  });

  const activeMembers = (members as StaffMember[]).filter(member => member.isActive);
  const visibleMembers = canManage ? activeMembers : activeMembers.filter(member => member.id === currentUser?.id);
  const pendingAvailability = availability.filter(item => item.status === 'PENDING').length;
  const isLoading = loadingMembers || loadingAvailability || loadingShifts || loadingTime;

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-diwan-gold">Planung</p>
          <h2 className="mt-1 font-display text-3xl text-ink">Team & Zeiten</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium text-ink2">
            Einfache Schichtplanung, Zeitvorschläge und Zeiterfassung für den Café-Alltag.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(value => value - 1)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-diwan-gold/12 bg-white text-ink2 hover:text-ink">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setWeekOffset(0)} className={cn('h-11 rounded-2xl px-4 text-sm font-bold', weekOffset === 0 ? 'bg-diwan-gold text-diwan-bg' : 'border border-diwan-gold/12 bg-white text-ink2')}>
            Heute
          </button>
          <button onClick={() => setWeekOffset(value => value + 1)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-diwan-gold/12 bg-white text-ink2 hover:text-ink">
            <ChevronRight size={18} />
          </button>
        </div>
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTabs active={activeTab} onChange={setActiveTab} canManage={canManage} pendingCount={pendingAvailability} />
        <p className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-ink2 shadow-sm">{weekLabel}</p>
      </div>

      {canManage && <CoverageSummary shifts={shifts} weekStart={weekStart} onAddShift={() => setShowShiftForm(true)} canManage={canManage} />}

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map(item => <div key={item} className="h-32 animate-pulse rounded-3xl bg-paper2" />)}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springs.gentle}
          >
            {activeTab === 'today' && (
              <TodayView
                dates={dates}
                shifts={shifts}
                members={visibleMembers}
                currentUser={currentUser}
                canManage={canManage}
                timeEntries={timeEntries}
                onClockIn={() => clockIn.mutate('')}
                onClockOut={(id) => clockOut.mutate({ id, breakMinutes: 30 })}
                clockPending={clockIn.isPending || clockOut.isPending}
              />
            )}
            {activeTab === 'schedule' && (
              <ScheduleView
                dates={dates}
                shifts={shifts}
                members={visibleMembers}
                canManage={canManage}
                onAddShift={() => setShowShiftForm(true)}
                onDeleteShift={(id) => deleteShift.mutate(id)}
              />
            )}
            {activeTab === 'availability' && (
              <AvailabilityView
                availability={availability}
                canManage={canManage}
                onApprove={(id) => updateAvailability.mutate({ id, data: { status: 'APPROVED' } })}
                onReject={(id) => updateAvailability.mutate({ id, data: { status: 'REJECTED' } })}
                onOpenForm={() => setShowAvailabilityForm(true)}
              />
            )}
            {activeTab === 'time' && (
              <TimeEntriesView
                entries={timeEntries}
                currentUserId={currentUser?.id || ''}
                onClockIn={() => clockIn.mutate('')}
                onClockOut={(id) => clockOut.mutate({ id, breakMinutes: 30 })}
                pending={clockIn.isPending || clockOut.isPending}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showShiftForm && (
          <ShiftFormModal
            isOpen={showShiftForm}
            onClose={() => setShowShiftForm(false)}
            staff={activeMembers}
            onSubmit={(data) => createShift.mutate({ ...data, weekStart: weekStartStr, status: 'APPROVED' })}
          />
        )}
        {showAvailabilityForm && (
          <AvailabilityFormModal
            isOpen={showAvailabilityForm}
            onClose={() => setShowAvailabilityForm(false)}
            staff={activeMembers}
            currentUserId={currentUser?.id || ''}
            canManage={canManage}
            weekStart={weekStart}
            onSubmit={(data) => createAvailability.mutate(data)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
