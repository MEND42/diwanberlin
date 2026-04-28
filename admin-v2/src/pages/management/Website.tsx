import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Globe, Clock, Phone, Instagram, Facebook, MapPin,
  Save, CheckCircle, type LucideIcon,
} from 'lucide-react';
import { siteApi } from '@/lib/api';
import { cn, springs } from '@/lib/utils';

type Lang = 'de' | 'en' | 'fa';

interface SiteBlock {
  id: string;
  key: string;
  label: string;
  type: string;
  valueDe?: string;
  valueEn?: string;
  valueFa?: string;
}

interface BlockDef {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

interface SectionDef {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  blocks: BlockDef[];
}

const LANGUAGES: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'de', label: '🇩🇪 DE', dir: 'ltr' },
  { code: 'en', label: '🇬🇧 EN', dir: 'ltr' },
  { code: 'fa', label: '🇮🇷 FA', dir: 'rtl' },
];

const SECTIONS: SectionDef[] = [
  {
    id: 'hero',
    title: 'Hero-Bereich',
    icon: Globe,
    color: 'bg-purple-50 text-purple-600',
    blocks: [
      { key: 'hero_title',    label: 'Hauptüberschrift',  placeholder: 'Willkommen im Diwan Berlin' },
      { key: 'hero_subtitle', label: 'Unterüberschrift',  placeholder: 'Persische Küche & Atmosphäre' },
      { key: 'hero_cta',      label: 'Call-to-Action',    placeholder: 'Tisch reservieren' },
    ],
  },
  {
    id: 'hours',
    title: 'Öffnungszeiten',
    icon: Clock,
    color: 'bg-amber-50 text-amber-600',
    blocks: [
      { key: 'hours_weekdays', label: 'Mo – Fr', placeholder: '12:00 – 22:00 Uhr' },
      { key: 'hours_weekend',  label: 'Sa – So', placeholder: '12:00 – 23:00 Uhr' },
      { key: 'hours_note',     label: 'Hinweis', placeholder: 'Küche schließt 30 Min. vor Restaurantschluss', multiline: true },
    ],
  },
  {
    id: 'contact',
    title: 'Kontakt & Adresse',
    icon: MapPin,
    color: 'bg-blue-50 text-blue-600',
    blocks: [
      { key: 'address_street', label: 'Straße',    placeholder: 'Musterstraße 1' },
      { key: 'address_city',   label: 'Stadt',     placeholder: '10115 Berlin' },
      { key: 'phone',          label: 'Telefon',   placeholder: '+49 30 …' },
      { key: 'email',          label: 'E-Mail',    placeholder: 'info@diwan-berlin.de' },
    ],
  },
  {
    id: 'social',
    title: 'Social Media',
    icon: Instagram,
    color: 'bg-pink-50 text-pink-600',
    blocks: [
      { key: 'instagram', label: 'Instagram', placeholder: '@diwanberlin' },
      { key: 'facebook',  label: 'Facebook',  placeholder: 'DiwanBerlin' },
    ],
  },
  {
    id: 'about',
    title: 'Über uns',
    icon: Globe,
    color: 'bg-green-50 text-green-600',
    blocks: [
      { key: 'aboutIntro', label: 'Über uns Text', placeholder: 'Das Diwan Berlin ist…', multiline: true },
    ],
  },
  {
    id: 'cultural',
    title: 'Kulturprogramm',
    icon: Globe,
    color: 'bg-orange-50 text-orange-600',
    blocks: [
      { key: 'pillar_poetry',        label: 'Poesieabende',        placeholder: 'Abende der Poesie und Literatur…', multiline: true },
      { key: 'pillar_music',         label: 'Kunst & Musik',       placeholder: 'Gitarre, Dambura, Rubab…',         multiline: true },
      { key: 'pillar_literature',    label: 'Literatur & Kultur',  placeholder: 'Buchlesungen, Filmabende…',        multiline: true },
      { key: 'private_celebrations', label: 'Private Feiern',      placeholder: 'Geburtstage, Hochzeiten…',         multiline: true },
      { key: 'multipurpose_space',   label: 'Räume mieten',        placeholder: 'Workshops, Konferenzen…',          multiline: true },
      { key: 'closing_invitation',   label: 'Abschluss-Einladung', placeholder: 'Herzlich willkommen…',             multiline: true },
    ],
  },
];

function LanguageTabs({
  activeLang, onChange
}: {
  activeLang: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <div className="flex gap-1 mb-3">
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          type="button"
          onClick={() => onChange(lang.code)}
          className={cn(
            'px-2 py-1 rounded-lg text-[10px] font-medium transition-all',
            activeLang === lang.code
              ? 'bg-diwan-gold text-diwan-bg'
              : 'bg-paper2 text-ink2 hover:bg-paper hover:text-ink'
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

function SectionCard({
  section, blocks, onChange, onSave, saving, saved,
}: {
  section: SectionDef;
  blocks: Record<string, { valueDe?: string; valueEn?: string; valueFa?: string }>;
  onChange: (key: string, lang: Lang, value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const Icon = section.icon;
  const [activeLang, setActiveLang] = useState<Lang>('de');
  const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm text-ink bg-paper border border-diwan-gold/15 focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 focus:border-diwan-gold/40 transition-all';
  const labelCls = 'block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium mb-1.5';

  const currentDir = LANGUAGES.find(l => l.code === activeLang)?.dir || 'ltr';

  return (
    <div className="bg-white rounded-2xl border border-diwan-gold/8 shadow-warm-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-paper2">
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', section.color)}>
            <Icon size={15} />
          </div>
          <h3 className="font-semibold text-ink text-sm">{section.title}</h3>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-diwan-gold text-diwan-bg hover:bg-diwan-gold2',
          )}
        >
          {saved ? <><CheckCircle size={12} /> Gespeichert</> : saving ? 'Speichern…' : <><Save size={12} /> Speichern</>}
        </button>
      </div>
      <div className="p-5 space-y-4">
        {section.blocks.map(b => (
          <div key={b.key}>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>{b.label}</label>
              <LanguageTabs activeLang={activeLang} onChange={setActiveLang} />
            </div>
            {b.multiline ? (
              <textarea
                value={blocks[b.key]?.[activeLang === 'en' ? 'valueEn' : activeLang === 'fa' ? 'valueFa' : 'valueDe'] ?? ''}
                onChange={e => onChange(b.key, activeLang, e.target.value)}
                rows={3}
                className={cn(inputCls, 'resize-none')}
                placeholder={b.placeholder}
                dir={currentDir}
              />
            ) : (
              <input
                value={blocks[b.key]?.[activeLang === 'en' ? 'valueEn' : activeLang === 'fa' ? 'valueFa' : 'valueDe'] ?? ''}
                onChange={e => onChange(b.key, activeLang, e.target.value)}
                className={inputCls}
                placeholder={b.placeholder}
                dir={currentDir}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Website() {
  const qc = useQueryClient();

  const { data: rawBlocks = [], isLoading } = useQuery<SiteBlock[]>({
    queryKey: ['site-content'],
    queryFn: siteApi.list as () => Promise<SiteBlock[]>,
  });

  // Local state: key → { valueDe, valueEn, valueFa }
  const [localValues, setLocalValues] = useState<Record<string, { valueDe?: string; valueEn?: string; valueFa?: string }>>({});
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});
  const [savingSection, setSavingSection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const map: Record<string, { valueDe?: string; valueEn?: string; valueFa?: string }> = {};
    (rawBlocks as SiteBlock[]).forEach(b => {
      map[b.key] = {
        valueDe: b.valueDe,
        valueEn: b.valueEn,
        valueFa: b.valueFa,
      };
    });
    setLocalValues(map);
  }, [rawBlocks]);

  function handleChange(key: string, lang: Lang, value: string) {
    setLocalValues(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [lang === 'en' ? 'valueEn' : lang === 'fa' ? 'valueFa' : 'valueDe']: value,
      },
    }));
    setSavedSections(prev => ({ ...prev, ...Object.fromEntries(SECTIONS.map(s => [s.id, false])) }));
  }

  async function saveSection(section: SectionDef) {
    setSavingSection(prev => ({ ...prev, [section.id]: true }));
    try {
      for (const b of section.blocks) {
        const existing = (rawBlocks as SiteBlock[]).find(r => r.key === b.key);
        const values = localValues[b.key] ?? { valueDe: '', valueEn: '', valueFa: '' };
        
        if (existing) {
          await siteApi.update(existing.id, {
            key: b.key,
            label: b.label,
            type: b.multiline ? 'TEXTAREA' : 'TEXT',
            valueDe: values.valueDe || null,
            valueEn: values.valueEn || null,
            valueFa: values.valueFa || null,
          });
        } else if (values.valueDe || values.valueEn || values.valueFa) {
          await siteApi.create({
            key: b.key,
            label: b.label,
            type: b.multiline ? 'TEXTAREA' : 'TEXT',
            valueDe: values.valueDe || null,
            valueEn: values.valueEn || null,
            valueFa: values.valueFa || null,
          });
        }
      }
      await qc.invalidateQueries({ queryKey: ['site-content'] });
      setSavedSections(prev => ({ ...prev, [section.id]: true }));
      setTimeout(() => setSavedSections(prev => ({ ...prev, [section.id]: false })), 3000);
    } finally {
      setSavingSection(prev => ({ ...prev, [section.id]: false }));
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">Verwaltung</p>
        <h2 className="font-display text-ink text-2xl font-normal">Website-Inhalte</h2>
      </motion.div>

      <div className="flex items-start gap-3 bg-diwan-gold/6 border border-diwan-gold/20 rounded-xl px-4 py-3">
        <Globe size={14} className="text-diwan-gold mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-ink2">
          Texte hier werden direkt auf der öffentlichen Website angezeigt. Jede Sektion separat speichern.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-paper2 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springs.gentle, delay: i * 0.06 }}
            >
              <SectionCard
                section={section}
                blocks={localValues}
                onChange={handleChange}
                onSave={() => saveSection(section)}
                saving={savingSection[section.id] ?? false}
                saved={savedSections[section.id] ?? false}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}