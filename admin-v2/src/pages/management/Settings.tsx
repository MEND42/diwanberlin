import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Save, Users, Calendar, Clock, Globe, CheckCircle2 } from 'lucide-react';
import { settingsApi, type SiteSetting } from '@/lib/api';

const CATEGORIES = [
  { key: 'capacities', label: 'Kapazitäten', icon: Users, fields: [
    { key: 'maxCapacity', label: 'Gesamtsitze', type: 'number' },
    { key: 'indoorSeats', label: 'Innenplätze', type: 'number' },
    { key: 'outdoorSeats', label: 'Außenplätze', type: 'number' },
    { key: 'maxPartySize', label: 'Max. Gruppengröße', type: 'number' },
    { key: 'eventsPerMonth', label: 'Events pro Monat', type: 'number' },
  ]},
  { key: 'hours', label: 'Öffnungszeiten', icon: Clock, fields: [
    { key: 'openingTime', label: 'Öffnung', type: 'time' },
    { key: 'closingTime', label: 'Schluss', type: 'time' },
    { key: 'kitchenClose', label: 'Küche schließt', type: 'time' },
  ]},
  { key: 'reservation', label: 'Reservierung', icon: Calendar, fields: [
    { key: 'advanceBookingDays', label: 'Vorausbuchung (Tage)', type: 'number' },
    { key: 'defaultReservationDuration', label: 'Standarddauer (Min)', type: 'number' },
    { key: 'slotDuration', label: 'Slot-Dauer (Min)', type: 'number' },
  ]},
  { key: 'contact', label: 'Kontakt', icon: Globe, fields: [
    { key: 'phone', label: 'Telefon', type: 'text' },
    { key: 'email', label: 'E-Mail', type: 'email' },
    { key: 'address', label: 'Adresse', type: 'text' },
  ]},
];

function SettingField({
  field,
  value,
  onChange,
  onSave,
  saving,
  saved,
}: {
  field: { key: string; label: string; type: string };
  value?: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="grid gap-2 py-4 border-b border-paper2 last:border-0 sm:grid-cols-[1fr_190px_92px] sm:items-center">
      <label htmlFor={`setting-${field.key}`} className="text-base font-semibold text-ink">{field.label}</label>
      <input
        id={`setting-${field.key}`}
        type={field.type === 'number' ? 'number' : field.type === 'time' ? 'time' : 'text'}
        inputMode={field.type === 'number' ? 'numeric' : undefined}
        min={field.type === 'number' ? 0 : undefined}
        step={field.type === 'number' ? 1 : undefined}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave();
        }}
        className="min-h-12 w-full rounded-2xl border border-diwan-gold/25 bg-white px-4 text-base font-bold text-ink outline-none focus:border-diwan-gold/60 focus:ring-4 focus:ring-diwan-gold/15"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-diwan-gold px-4 text-sm font-bold text-diwan-bg shadow-sm hover:bg-diwan-gold2 disabled:opacity-50"
      >
        {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
        {saving ? 'Speichert' : saved ? 'Gespeichert' : 'Speichern'}
      </button>
    </div>
  );
}

function CategorySection({
  category,
  values,
  onChange,
  onSave,
  savingKey,
  savedKey,
}: {
  category: { key: string; label: string; icon: any; fields: { key: string; label: string; type: string }[] };
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: (field: { key: string; type: string }, categoryKey: string) => void;
  savingKey: string | null;
  savedKey: string | null;
}) {
  const Icon = category.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-diwan-gold/8 shadow-warm-sm overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-paper2 bg-paper2/30">
        <div className="w-8 h-8 rounded-xl bg-diwan-gold/10 flex items-center justify-center">
          <Icon size={15} className="text-diwan-gold" />
        </div>
        <h3 className="font-semibold text-ink text-sm">{category.label}</h3>
      </div>
      <div className="p-5 space-y-1">
        {category.fields.map(field => (
          <SettingField
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(value) => onChange(field.key, value)}
            onSave={() => onSave(field, category.key)}
            saving={savingKey === field.key}
            saved={savedKey === field.key}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function Settings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading } = useQuery<SiteSetting[]>({
    queryKey: ['settings'],
    queryFn: settingsApi.list,
  });

  const values = useMemo(() => {
    const fromServer = Object.fromEntries(settings.map(setting => [setting.key, setting.value ?? '']));
    return { ...fromServer, ...drafts };
  }, [drafts, settings]);

  const updateMutation = useMutation({
    mutationFn: ({ key, value, type, category }: { key: string; value: string; type: string; category: string }) =>
      settingsApi.set({ key, value, type: type === 'number' ? 'NUMBER' : 'STRING', category }),
    onMutate: ({ key }) => setSaving(key),
    onSuccess: (_data, variables) => {
      setSaved(variables.key);
      setTimeout(() => setSaved(current => current === variables.key ? null : current), 1800);
    },
    onSettled: async () => {
      setSaving(null);
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleChange = (key: string, value: string) => {
    setDrafts(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (field: { key: string; type: string }, category: string) => {
    updateMutation.mutate({
      key: field.key,
      value: values[field.key] ?? '',
      type: field.type,
      category,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-paper2 rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-48 bg-paper2 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">Konfiguration</p>
        <h2 className="font-display text-ink text-2xl font-normal">Einstellungen</h2>
      </motion.div>

      {/* Info banner */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-diwan-gold/6 border border-diwan-gold/15">
        <SettingsIcon size={14} className="text-diwan-gold flex-shrink-0" />
        <p className="text-xs text-ink2">
          Diese Einstellungen steuern die öffentliche Website und Reservierungslogik.
          Änderungen sind sofort aktiv.
        </p>
      </div>

      {/* Categories */}
      <div className="grid gap-6 md:grid-cols-2">
        {CATEGORIES.map(cat => (
          <CategorySection
            key={cat.key}
            category={cat}
            values={values}
            onChange={handleChange}
            onSave={handleSave}
            savingKey={saving}
            savedKey={saved}
          />
        ))}
      </div>

      {/* Save indicator */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-medium shadow-lg"
          >
            <Save size={14} className="animate-pulse" />
            Speichern...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
