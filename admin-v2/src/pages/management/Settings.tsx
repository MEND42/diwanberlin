import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Save, Plus, Trash2, GripVertical, Users, Grid3X3, Calendar, Clock, Globe } from 'lucide-react';
import { settingsApi, type SiteSetting } from '@/lib/api';
import { cn, springs } from '@/lib/utils';

const CATEGORIES = [
  { key: 'capacities', label: 'Kapazitäten', icon: Users, fields: [
    { key: 'totalSeats', label: 'Gesamtsitze', type: 'number' },
    { key: 'indoorSeats', label: 'Innenplätze', type: 'number' },
    { key: 'outdoorSeats', label: 'Außenplätze', type: 'number' },
    { key: 'maxPartySize', label: 'Max. Gruppengröße', type: 'number' },
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
}: {
  field: { key: string; label: string; type: string };
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-paper2 last:border-0">
      <label className="text-sm text-ink">{field.label}</label>
      <input
        type={field.type === 'number' ? 'number' : field.type === 'time' ? 'time' : 'text'}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="w-32 px-3 py-1.5 text-sm rounded-lg border border-diwan-gold/20 text-ink bg-paper2 focus:ring-2 focus:ring-diwan-gold/25 focus:border-diwan-gold/40 outline-none"
      />
    </div>
  );
}

function CategorySection({
  category,
  settings,
  onUpdate,
  onDelete,
}: {
  category: { key: string; label: string; icon: any; fields: { key: string; label: string; type: string }[] };
  settings: SiteSetting[];
  onUpdate: (key: string, value: string) => void;
  onDelete: (key: string) => void;
}) {
  const Icon = category.icon;
  const values = Object.fromEntries(settings.filter(s => s.category === category.key).map(s => [s.key, s.value]));

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
            onChange={(value) => onUpdate(field.key, value)}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function Settings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: settings = [], isLoading } = useQuery<SiteSetting[]>({
    queryKey: ['settings'],
    queryFn: settingsApi.list,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      settingsApi.update(key, { value }),
    onMutate: ({ key }) => setSaving(key),
    onSettled: () => {
      setSaving(null);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleUpdate = (key: string, value: string) => {
    updateMutation.mutate({ key, value });
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
            settings={settings}
            onUpdate={handleUpdate}
            onDelete={() => {}}
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