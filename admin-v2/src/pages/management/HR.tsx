import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Clock, Save, Plus, Trash2,
  LogIn, LogOut, AlertTriangle, Check, X, User
} from 'lucide-react';
import { hrApi, teamApi } from '@/lib/api';
import { cn, springs, getInitials, ROLE_LABELS } from '@/lib/utils';
import type { TeamMember, Role, StaffAvailability, ShiftAssignment, TimeEntry, StaffProfile } from '@/types';
import { useAppStore } from '@/store/appStore';

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

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── Shift Cell Component ───────────────────────────────────
function ShiftCell({
  shifts,
  weekStart,
  member,
  dayIdx,
  onUpdate,
}: {
  shifts: ShiftAssignment[];
  weekStart: Date;
  member: TeamMember & { staffProfile?: StaffProfile };
  dayIdx: number;
  onUpdate: (id: string, data: { startTime: string; endTime: string }) => void;
}) {
  const shift = shifts.find(s =>
    s.adminUserId === member.id &&
    s.dayOfWeek === dayIdx + 1 &&
    s.status === 'APPROVED'
  );

  const today = new Date();
  const cellDate = new Date(weekStart);
  cellDate.setDate(cellDate.getDate() + dayIdx);
  const isToday = cellDate.toDateString() === today.toDateString();

  const isEmpty = !shift?.startTime;

  return (
    <div className={cn('relative group', isToday && 'ring-1 ring-diwan-gold/30 rounded-lg')}>
      {shift ? (
        <div className="w-full text-center text-[11px] rounded-lg px-1 py-2 bg-white border border-diwan-gold/15 text-ink font-medium">
          {shift.startTime}–{shift.endTime}
        </div>
      ) : (
        <div className="w-full text-center text-[11px] rounded-lg px-1 py-2 border border-transparent text-ink2/30">
          —
        </div>
      )}
    </div>
  );
}

// ── Coverage Warning Component ───────────────────────────────
function CoverageWarnings({ shifts, weekStart }: { shifts: ShiftAssignment[]; weekStart: Date }) {
  const warnings: string[] = [];

  for (let day = 1; day <= 7; day++) {
    const dayShifts = shifts.filter(s => s.dayOfWeek === day && s.status === 'APPROVED');
    const morning = dayShifts.filter(s => s.startTime <= '12:00' && s.endTime > '07:00').length;
    const afternoon = dayShifts.filter(s => s.startTime < '17:00' && s.endTime >= '14:00').length;
    const evening = dayShifts.filter(s => s.startTime < '21:00' && s.endTime >= '18:00').length;

    if (morning < 1) warnings.push(`${DAY_LABELS[day - 1]} 07:00-12:00: unterbesetzt`);
    if (afternoon < 1) warnings.push(`${DAY_LABELS[day - 1]} 14:00-17:00: unterbesetzt`);
    if (evening < 1) warnings.push(`${DAY_LABELS[day - 1]} 18:00-21:00: unterbesetzt`);
  }

  if (warnings.length === 0) return null;

  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
      <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
      <div className="text-[11px] text-red-700">
        <span className="font-semibold">Deckungswarnung:</span> {warnings.slice(0, 4).join(' • ')}
      </div>
    </div>
  );
}

// ── Availability Section ─────────────────────────────────────
function AvailabilitySection({
  availability,
  onApprove,
  onReject,
  canManage,
}: {
  availability: StaffAvailability[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  canManage: boolean;
}) {
  const pending = availability.filter(a => a.status === 'PENDING');

  if (pending.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-ink2 uppercase tracking-wide">Vorschläge</h4>
      <div className="space-y-1">
        {pending.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-diwan-gold/5 border border-diwan-gold/10"
          >
            <div className="flex items-center gap-2">
              <User size={12} className="text-diwan-gold" />
              <span className="text-xs text-ink">
                {item.adminUser?.staffProfile?.fullName || item.adminUser?.username}
              </span>
              <span className="text-[10px] text-ink2">
                {DAY_LABELS[item.dayOfWeek - 1]} {item.startTime}–{item.endTime}
              </span>
            </div>
            {canManage && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onApprove(item.id)}
                  className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => onReject(item.id)}
                  className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Time Entries Section ─────────────────────────────────────
function TimeEntriesSection({
  timeEntries,
  onClockIn,
  onClockOut,
  canTrack,
  currentUserId,
}: {
  timeEntries: TimeEntry[];
  onClockIn: () => void;
  onClockOut: (id: string) => void;
  canTrack: boolean;
  currentUserId: string;
}) {
  const openEntry = timeEntries.find(e => e.status === 'OPEN' && e.adminUserId === currentUserId);
  const recentEntries = timeEntries.slice(0, 10);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-ink2 uppercase tracking-wide">Zeiterfassung</h4>

      {canTrack && (
        <div className="flex items-center gap-2 mb-2">
          {!openEntry ? (
            <button
              onClick={onClockIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition-colors"
            >
              <LogIn size={12} /> Einstempeln
            </button>
          ) : (
            <button
              onClick={() => onClockOut(openEntry.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors"
            >
              <LogOut size={12} /> Ausstempeln
            </button>
          )}
        </div>
      )}

      {recentEntries.length > 0 ? (
        <div className="space-y-1">
          {recentEntries.map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-paper2/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink">
                  {entry.adminUser?.staffProfile?.fullName || entry.adminUser?.username}
                </span>
                <span className="text-[10px] text-ink2">
                  {new Date(entry.clockIn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  {entry.clockOut && ` – ${new Date(entry.clockOut).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}
                </span>
              </div>
              <span className={cn(
                'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                entry.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                entry.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              )}>
                {entry.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink2/60 italic">Keine Zeiteinträge</p>
      )}
    </div>
  );
}

// ── Shift Form Modal ─────────────────────────────────────────
function ShiftFormModal({
  isOpen,
  onClose,
  staff,
  weekStart,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  staff: (TeamMember & { staffProfile?: StaffProfile })[];
  weekStart: Date;
  onSubmit: (data: { adminUserId: string; dayOfWeek: number; startTime: string; endTime: string }) => void;
}) {
  const [adminUserId, setAdminUserId] = useState(staff[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ adminUserId, dayOfWeek, startTime, endTime });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5"
      >
        <h3 className="text-lg font-semibold text-ink mb-4">Schicht eintragen</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1">Mitarbeiter</label>
            <select
              value={adminUserId}
              onChange={e => setAdminUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-diwan-gold/20 text-ink text-sm focus:ring-2 focus:ring-diwan-gold/25 focus:border-diwan-gold/40"
            >
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.staffProfile?.fullName || s.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink2 mb-1">Tag</label>
            <select
              value={dayOfWeek}
              onChange={e => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-diwan-gold/20 text-ink text-sm"
            >
              {DAY_LABELS.map((d, i) => (
                <option key={i + 1} value={i + 1}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-diwan-gold/20 text-ink text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1">Ende</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-diwan-gold/20 text-ink text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-ink2 hover:bg-paper2 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold/90 transition-colors"
            >
              Speichern
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Availability Form Modal ──────────────────────────────────
function AvailabilityFormModal({
  isOpen,
  onClose,
  staff,
  currentUserId,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  staff: (TeamMember & { staffProfile?: StaffProfile })[];
  currentUserId: string;
  onSubmit: (data: { adminUserId: string; dayOfWeek: number; startTime: string; endTime: string; weekStart: string }) => void;
}) {
  const [adminUserId, setAdminUserId] = useState(currentUserId);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const weekStart = getWeekStart(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ adminUserId, dayOfWeek, startTime, endTime, weekStart: isoDate(weekStart) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5"
      >
        <h3 className="text-lg font-semibold text-ink mb-4">Zeit vorschlagen</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink2 mb-1">Mitarbeiter</label>
            <select
              value={adminUserId}
              onChange={e => setAdminUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-diwan-gold/20 text-ink text-sm"
            >
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.staffProfile?.fullName || s.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink2 mb-1">Tag</label>
            <select
              value={dayOfWeek}
              onChange={e => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-diwan-gold/20 text-ink text-sm"
            >
              {DAY_LABELS.map((d, i) => (
                <option key={i + 1} value={i + 1}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-diwan-gold/20 text-ink text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1">Ende</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-diwan-gold/20 text-ink text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-ink2 hover:bg-paper2 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold/90 transition-colors"
            >
              Vorschlagen
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main HR Component ────────────────────────────────────────
export function HR() {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);

  const weekStart = getWeekStart(weekOffset);
  const weekStartStr = isoDate(weekStart);

  const currentUser = useAppStore(s => s.currentUser);
  const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER';

  // Fetch data from API
  const { data: members = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: teamApi.list,
  });

  const { data: availability = [], isLoading: loadingAvailability } = useQuery<StaffAvailability[]>({
    queryKey: ['hr-availability', weekStartStr],
    queryFn: () => hrApi.getAvailability(weekStartStr),
    enabled: canManage,
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery<ShiftAssignment[]>({
    queryKey: ['hr-shifts', weekStartStr],
    queryFn: () => hrApi.getShifts(weekStartStr),
  });

  const { data: timeEntries = [], isLoading: loadingTime } = useQuery<TimeEntry[]>({
    queryKey: ['hr-time-entries', weekStartStr],
    queryFn: () => hrApi.getTimeEntries(weekStartStr),
  });

  // Mutations
  const createShift = useMutation({
    mutationFn: hrApi.createShift,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-shifts'] }),
  });

  const createAvailability = useMutation({
    mutationFn: hrApi.submitAvailability,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-availability'] }),
  });

  const updateAvailability = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string } }) =>
      hrApi.updateAvailability(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-availability'] }),
  });

  const clockIn = useMutation({
    mutationFn: hrApi.clockIn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-time-entries'] }),
  });

  const clockOut = useMutation({
    mutationFn: ({ id, breakMinutes }: { id: string; breakMinutes?: number }) =>
      hrApi.clockOut(id, breakMinutes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-time-entries'] }),
  });

  const activeMembers = members.filter(m => m.isActive);

  // Build date headers
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  const weekLabel = weekStart.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) + ' – ' +
    dates[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  const isLoading = loadingMembers || loadingAvailability || loadingShifts || loadingTime;

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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAvailabilityForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-diwan-gold/10 text-diwan-gold text-xs font-medium hover:bg-diwan-gold/20 transition-colors"
        >
          <Clock size={12} /> Zeit vorschlagen
        </button>
        {canManage && (
          <button
            onClick={() => setShowShiftForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-diwan-gold text-diwan-bg text-xs font-medium hover:bg-diwan-gold/90 transition-colors"
          >
            <Plus size={12} /> Schicht eintragen
          </button>
        )}
      </div>

      {/* Coverage Warnings */}
      <CoverageWarnings shifts={shifts} weekStart={weekStart} />

      {/* Main Grid */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-paper2 animate-pulse" />)}</div>
      ) : activeMembers.length === 0 ? (
        <div className="text-center py-20 text-ink2 text-sm">Keine aktiven Mitarbeiter</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '160px repeat(7, 1fr)' }}>
              <div />
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
                    <ShiftCell
                      key={di}
                      shifts={shifts}
                      weekStart={weekStart}
                      member={m}
                      dayIdx={di}
                      onUpdate={() => {}}
                    />
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-diwan-gold/10">
        {/* Availability Proposals */}
        {canManage && (
          <AvailabilitySection
            availability={availability}
            onApprove={(id) => updateAvailability.mutate({ id, data: { status: 'APPROVED' } })}
            onReject={(id) => updateAvailability.mutate({ id, data: { status: 'REJECTED' } })}
            canManage={canManage}
          />
        )}

        {/* Time Entries */}
        <TimeEntriesSection
          timeEntries={timeEntries}
          onClockIn={() => clockIn.mutate('')}
          onClockOut={(id) => {
            const mins = prompt('Pause in Minuten:', '30');
            clockOut.mutate({ id, breakMinutes: mins ? parseInt(mins) : 30 });
          }}
          canTrack={!!currentUser}
          currentUserId={currentUser?.id || ''}
        />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showShiftForm && (
          <ShiftFormModal
            isOpen={showShiftForm}
            onClose={() => setShowShiftForm(false)}
            staff={activeMembers}
            weekStart={weekStart}
            onSubmit={(data) => createShift.mutate({ ...data, weekStart: weekStartStr, status: 'APPROVED' })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAvailabilityForm && (
          <AvailabilityFormModal
            isOpen={showAvailabilityForm}
            onClose={() => setShowAvailabilityForm(false)}
            staff={activeMembers}
            currentUserId={currentUser?.id || ''}
            onSubmit={(data) => createAvailability.mutate(data)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}