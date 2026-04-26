import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarRange, Plus, Pencil, Trash2, Eye, EyeOff,
  Users, Euro, ChevronDown, ChevronUp, Check, X, Clock,
  Mail, Phone, MessageSquare, MapPin,
} from 'lucide-react';
import { eventsApi } from '@/lib/api';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { cn, springs, formatEur } from '@/lib/utils';
import type { EventListing, EventRegistration } from '@/types';

const EMPTY: Omit<EventListing, 'id'> = {
  titleDe: '', titleFa: '', description: '', descriptionFull: '', descriptionFa: '',
  eventDate: '', eventTime: '',
  isPublished: false, sortOrder: 0,
  imageUrl: '', registrationOpen: false, location: '',
  maxAttendees: undefined, price: undefined,
};

const REG_STATUS: Record<EventRegistration['status'], { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Ausstehend', bg: 'bg-amber-100',  text: 'text-amber-700' },
  CONFIRMED: { label: 'Bestätigt',  bg: 'bg-green-100',  text: 'text-green-700' },
  CANCELLED: { label: 'Abgesagt',   bg: 'bg-red-100',    text: 'text-red-600'   },
};

function ListingForm({
  value, onChange,
}: {
  value: Omit<EventListing, 'id'>;
  onChange: (v: Omit<EventListing, 'id'>) => void;
}) {
  const set = (k: keyof typeof value, v: unknown) => onChange({ ...value, [k]: v });
  const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm text-ink bg-paper border border-diwan-gold/15 focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 focus:border-diwan-gold/40 transition-all';
  const labelCls = 'block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium mb-1.5';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Titel (DE)</label>
          <input value={value.titleDe} onChange={e => set('titleDe', e.target.value)} className={inputCls} placeholder="Titel auf Deutsch" />
        </div>
        <div>
          <label className={labelCls}>Titel (FA)</label>
          <input value={value.titleFa ?? ''} onChange={e => set('titleFa', e.target.value)} className={inputCls} placeholder="عنوان" dir="rtl" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Beschreibung</label>
        <textarea
          value={value.description ?? ''}
          onChange={e => set('description', e.target.value)}
          rows={3}
          className={cn(inputCls, 'resize-none')}
          placeholder="Kurze Beschreibung des Events…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ort / Raum</label>
          <input value={value.location ?? ''} onChange={e => set('location', e.target.value)} className={inputCls} placeholder="Hauptraum" />
        </div>
        <div>
          <label className={labelCls}>Bild URL</label>
          <input value={value.imageUrl ?? ''} onChange={e => set('imageUrl', e.target.value)} className={inputCls} placeholder="/uploads/events/..." />
        </div>
      </div>
      <div>
        <label className={labelCls}>Langbeschreibung</label>
        <textarea
          value={value.descriptionFull ?? ''}
          onChange={e => set('descriptionFull', e.target.value)}
          rows={3}
          className={cn(inputCls, 'resize-none')}
          placeholder="Mehr Details für die Website-Anmeldung…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Datum</label>
          <input type="date" value={value.eventDate} onChange={e => set('eventDate', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Uhrzeit</label>
          <input type="time" value={value.eventTime} onChange={e => set('eventTime', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Max. Teilnehmer</label>
          <input type="number" min={0} value={value.maxAttendees ?? ''} onChange={e => set('maxAttendees', e.target.value ? Number(e.target.value) : undefined)} className={inputCls} placeholder="—" />
        </div>
        <div>
          <label className={labelCls}>Preis (€)</label>
          <input type="number" min={0} step={0.01} value={value.price ?? ''} onChange={e => set('price', e.target.value ? Number(e.target.value) : undefined)} className={inputCls} placeholder="Kostenlos" />
        </div>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => set('isPublished', !value.isPublished)}
            className={cn('w-10 h-5 rounded-full relative transition-colors', value.isPublished ? 'bg-diwan-gold' : 'bg-paper2 border border-diwan-gold/20')}
          >
            <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform', value.isPublished ? 'translate-x-5' : 'translate-x-0.5')} />
          </div>
          <span className="text-sm text-ink">Veröffentlicht</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => set('registrationOpen', !value.registrationOpen)}
            className={cn('w-10 h-5 rounded-full relative transition-colors', value.registrationOpen ? 'bg-diwan-gold' : 'bg-paper2 border border-diwan-gold/20')}
          >
            <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform', value.registrationOpen ? 'translate-x-5' : 'translate-x-0.5')} />
          </div>
          <span className="text-sm text-ink">Anmeldung offen</span>
        </label>
      </div>
    </div>
  );
}

function RegistrationsSheet({
  listing,
  onClose,
}: {
  listing: EventListing | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { data: registrations = [], isLoading } = useQuery<EventRegistration[]>({
    queryKey: ['event-registrations', listing?.id],
    queryFn:  () => eventsApi.registrations(listing!.id),
    enabled:  Boolean(listing),
    refetchInterval: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventRegistration['status'] }) =>
      eventsApi.updateRegistration(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-registrations', listing?.id] });
      qc.invalidateQueries({ queryKey: ['event-listings'] });
    },
  });

  if (!listing) return null;

  const confirmed = registrations
    .filter(r => r.status !== 'CANCELLED')
    .reduce((s, r) => s + r.guests, 0);

  const capacity   = listing.maxAttendees ?? 0;
  const pct        = capacity > 0 ? Math.min(100, Math.round((confirmed / capacity) * 100)) : 0;
  const remaining  = capacity > 0 ? Math.max(0, capacity - confirmed) : null;

  return (
    <BottomSheet isOpen={Boolean(listing)} onClose={onClose} title="Anmeldungen">
      <div className="px-5 pb-8 space-y-5">
        {/* Header stats */}
        <div className="bg-paper rounded-2xl border border-diwan-gold/10 p-4">
          <p className="text-sm font-semibold text-ink mb-1 truncate">{listing.titleDe}</p>
          <p className="text-[11px] text-ink2 mb-3">
            {new Date(listing.eventDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}{listing.eventTime} Uhr
          </p>

          {capacity > 0 && (
            <>
              <div className="flex justify-between text-xs text-ink2 mb-1.5">
                <span>{confirmed} von {capacity} Plätzen belegt</span>
                <span className={cn('font-semibold', remaining === 0 ? 'text-red-600' : 'text-green-700')}>
                  {remaining === 0 ? 'Ausgebucht' : `${remaining} frei`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-paper2 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 mt-3">
            <div className="text-center">
              <p className="text-xl font-bold text-ink">{registrations.filter(r => r.status === 'CONFIRMED').length}</p>
              <p className="text-[10px] text-ink2 uppercase tracking-wide">Bestätigt</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-600">{registrations.filter(r => r.status === 'PENDING').length}</p>
              <p className="text-[10px] text-ink2 uppercase tracking-wide">Ausstehend</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-500">{registrations.filter(r => r.status === 'CANCELLED').length}</p>
              <p className="text-[10px] text-ink2 uppercase tracking-wide">Abgesagt</p>
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-paper2 animate-pulse" />)}
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-diwan-gold/10 flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-diwan-gold" />
            </div>
            <p className="text-sm font-semibold text-ink">Keine Anmeldungen</p>
            <p className="text-xs text-ink2 mt-1">Noch keine Anmeldungen für dieses Event</p>
          </div>
        ) : (
          <div className="space-y-2">
            {registrations.map(reg => {
              const sm = REG_STATUS[reg.status];
              return (
                <div key={reg.id} className="bg-paper rounded-2xl border border-diwan-gold/10 p-3.5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-ink truncate">{reg.name}</p>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', sm.bg, sm.text)}>
                          {sm.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink2">
                        <span className="flex items-center gap-1">
                          <Mail size={9} />{reg.email}
                        </span>
                        {reg.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={9} />{reg.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={9} />{reg.guests} {reg.guests === 1 ? 'Person' : 'Personen'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={9} />{new Date(reg.createdAt).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {reg.message && (
                    <div className="rounded-lg bg-white border border-diwan-gold/8 px-3 py-2 mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare size={10} className="text-ink2" />
                        <span className="text-[10px] text-ink2 uppercase tracking-wide font-medium">Nachricht</span>
                      </div>
                      <p className="text-xs text-ink">{reg.message}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {reg.status !== 'CANCELLED' && (
                    <div className="flex gap-2 mt-1">
                      {reg.status === 'PENDING' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: reg.id, status: 'CONFIRMED' })}
                          disabled={updateStatus.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          <Check size={11} /> Bestätigen
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus.mutate({ id: reg.id, status: 'CANCELLED' })}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        <X size={11} /> Absagen
                      </button>
                    </div>
                  )}
                  {reg.status === 'CANCELLED' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: reg.id, status: 'PENDING' })}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-diwan-gold/15 text-ink2 text-xs font-semibold hover:border-diwan-gold/30 disabled:opacity-50 transition-colors"
                    >
                      Reaktivieren
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export function EventListings() {
  const qc = useQueryClient();
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [editing,     setEditing]     = useState<EventListing | null>(null);
  const [form,        setForm]        = useState<Omit<EventListing, 'id'>>(EMPTY);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [regListing,  setRegListing]  = useState<EventListing | null>(null);

  const { data: listings = [], isLoading } = useQuery<EventListing[]>({
    queryKey: ['event-listings'],
    queryFn:  eventsApi.listings,
  });

  const save = useMutation({
    mutationFn: () => editing
      ? eventsApi.updateListing(editing.id, form)
      : eventsApi.createListing(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-listings'] });
      setSheetOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
  });

  const togglePublish = useMutation({
    mutationFn: (ev: EventListing) => eventsApi.updateListing(ev.id, { ...ev, isPublished: !ev.isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-listings'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => eventsApi.deleteListing(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-listings'] }); setDeleting(null); },
  });

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setSheetOpen(true);
  }

  function openEdit(ev: EventListing) {
    setEditing(ev);
    setForm({ ...ev });
    setSheetOpen(true);
  }

  const sorted = [...listings].sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">Website</p>
          <h2 className="font-display text-ink text-2xl font-normal">Eventkalender</h2>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 transition-colors"
        >
          <Plus size={15} /> Event erstellen
        </button>
      </motion.div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-paper2 animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-diwan-gold/10 flex items-center justify-center mb-4">
            <CalendarRange size={24} className="text-diwan-gold" />
          </div>
          <p className="font-semibold text-ink mb-1">Keine Events</p>
          <p className="text-xs text-ink2">Erstellen Sie Ihr erstes Event</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sorted.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ ...springs.gentle, delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-diwan-gold/8 overflow-hidden"
              >
                {/* Main row */}
                <div className="px-4 py-4 flex items-center gap-4">
                  {/* Date block */}
                  <div className="w-12 h-12 rounded-xl bg-diwan-gold/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-diwan-gold uppercase">
                      {new Date(ev.eventDate).toLocaleDateString('de-DE', { month: 'short' })}
                    </span>
                    <span className="text-xl font-bold text-ink leading-none">
                      {new Date(ev.eventDate).getDate()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-ink truncate">{ev.titleDe}</p>
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                        ev.isPublished ? 'bg-green-100 text-green-700' : 'bg-paper2 text-ink2',
                      )}>
                        {ev.isPublished ? 'Live' : 'Entwurf'}
                      </span>
                      {ev.registrationOpen && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-blue-100 text-blue-700">
                          Anmeldung
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-ink2">
                      <span>{ev.eventTime} Uhr</span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={9} />{ev.location}
                        </span>
                      )}
                      {ev.maxAttendees && (
                        <span className="flex items-center gap-1">
                          <Users size={9} />
                          {ev.registrationsCount ?? 0}/{ev.maxAttendees}
                        </span>
                      )}
                      {ev.price != null && Number(ev.price) > 0 && (
                        <span className="flex items-center gap-1">
                          <Euro size={9} />{formatEur(ev.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Registrations button */}
                    {ev.registrationOpen && (
                      <button
                        onClick={() => setRegListing(ev)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                        title="Anmeldungen anzeigen"
                      >
                        <Users size={12} />
                        {ev.registrationsCount != null ? ev.registrationsCount : '—'}
                      </button>
                    )}
                    <button
                      onClick={() => togglePublish.mutate(ev)}
                      title={ev.isPublished ? 'Verstecken' : 'Veröffentlichen'}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-paper2 transition-colors text-ink2"
                    >
                      {ev.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => openEdit(ev)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-paper2 transition-colors text-ink2"
                    >
                      <Pencil size={14} />
                    </button>
                    {deleting === ev.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => remove.mutate(ev.id)} className="text-[11px] text-red-600 font-bold hover:underline">Löschen</button>
                        <button onClick={() => setDeleting(null)} className="text-[11px] text-ink2 hover:underline">Abbrechen</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleting(ev.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors text-ink2 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Capacity bar (visible when registration is open and capacity set) */}
                {ev.registrationOpen && ev.maxAttendees && (
                  <div className="px-4 pb-3">
                    <div className="h-1 rounded-full bg-paper2 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          (ev.registrationsCount ?? 0) >= ev.maxAttendees
                            ? 'bg-red-400'
                            : (ev.registrationsCount ?? 0) / ev.maxAttendees >= 0.8
                              ? 'bg-amber-400'
                              : 'bg-green-400',
                        )}
                        style={{ width: `${Math.min(100, ((ev.registrationsCount ?? 0) / ev.maxAttendees) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditing(null); }}
        title={editing ? 'Event bearbeiten' : 'Neues Event'}
      >
        <div className="px-5 pb-8 space-y-5">
          <ListingForm value={form} onChange={setForm} />
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.titleDe || !form.eventDate}
            className="w-full py-3 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 disabled:opacity-50 transition-colors"
          >
            {save.isPending ? 'Wird gespeichert…' : editing ? 'Änderungen speichern' : 'Event erstellen'}
          </button>
        </div>
      </BottomSheet>

      {/* Registrations sheet */}
      <RegistrationsSheet
        listing={regListing}
        onClose={() => setRegListing(null)}
      />
    </div>
  );
}
