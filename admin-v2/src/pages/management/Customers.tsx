import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, Star, Tag, Pencil,
  ChevronRight, Percent, Euro, Clock,
} from 'lucide-react';
import { customersApi } from '@/lib/api';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { cn, springs, formatEur } from '@/lib/utils';
import type { Customer, Discount } from '@/types';

type TabKey = 'customers' | 'discounts';

type DiscountDraft = { code: string; description: string; type: 'PERCENT' | 'FIXED'; value: number; minSpend?: number; isActive: boolean; expiresAt: string };
const DISCOUNT_EMPTY: DiscountDraft = { code: '', description: '', type: 'PERCENT', value: 0, minSpend: undefined, isActive: true, expiresAt: '' };

const CUSTOMER_EMPTY = { name: '', email: '', phone: '', notes: '' };

// ── Customers tab ────────────────────────────────────────────

function CustomerSheet({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const qc   = useQueryClient();
  const [form, setForm] = useState({ name: customer?.name ?? '', email: customer?.email ?? '', phone: customer?.phone ?? '', notes: customer?.notes ?? '' });
  const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm text-ink bg-paper border border-diwan-gold/15 focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 transition-all';
  const labelCls = 'block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium mb-1.5';

  const save = useMutation({
    mutationFn: () => customer
      ? customersApi.update(customer.id, form)
      : customersApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); onClose(); },
  });

  return (
    <div className="px-5 pb-8 space-y-4">
      {customer && (
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-diwan-gold/20 flex items-center justify-center text-diwan-gold text-xl font-bold">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-ink">{customer.name}</p>
            <p className="text-xs text-ink2 flex items-center gap-1"><Star size={10} className="text-diwan-gold" /> {customer.points} Punkte · {formatEur(customer.totalSpend)} Umsatz</p>
          </div>
        </div>
      )}
      {[
        { key: 'name',  label: 'Name',    placeholder: 'Vollständiger Name' },
        { key: 'email', label: 'E-Mail',  placeholder: 'email@beispiel.de' },
        { key: 'phone', label: 'Telefon', placeholder: '+49 30 …' },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className={labelCls}>{label}</label>
          <input value={(form as Record<string,string>)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className={inputCls} placeholder={placeholder} />
        </div>
      ))}
      <div>
        <label className={labelCls}>Notizen</label>
        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className={cn(inputCls, 'resize-none')} placeholder="Interne Notizen…" />
      </div>
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || !form.name}
        className="w-full py-3 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 disabled:opacity-50 transition-colors"
      >
        {save.isPending ? 'Wird gespeichert…' : customer ? 'Speichern' : 'Kunde anlegen'}
      </button>
    </div>
  );
}

// ── Discounts tab ─────────────────────────────────────────────

function DiscountRow({ d, onEdit }: { d: Discount; onEdit: () => void }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => customersApi.updateDiscount(d.id, { ...d, isActive: !d.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discounts'] }),
  });
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-diwan-gold/8 px-4 py-3.5">
      <div className="w-10 h-10 rounded-xl bg-diwan-gold/10 flex items-center justify-center flex-shrink-0">
        {d.type === 'PERCENT' ? <Percent size={16} className="text-diwan-gold" /> : <Euro size={16} className="text-diwan-gold" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-ink tracking-wide font-mono">{d.code}</p>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', d.isActive ? 'bg-green-100 text-green-700' : 'bg-paper2 text-ink2')}>
            {d.isActive ? 'Aktiv' : 'Inaktiv'}
          </span>
        </div>
        <p className="text-[11px] text-ink2 mt-0.5">
          {d.type === 'PERCENT' ? `${d.value}% Rabatt` : `${formatEur(d.value)} Rabatt`}
          {d.minSpend ? ` · ab ${formatEur(d.minSpend)}` : ''}
          {d.expiresAt ? ` · bis ${d.expiresAt.slice(0, 10)}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={() => toggle.mutate()} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-paper2 transition-colors text-ink2">
          <div className={cn('w-8 h-4 rounded-full relative transition-colors', d.isActive ? 'bg-diwan-gold' : 'bg-paper2 border border-diwan-gold/20')}>
            <div className={cn('absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform', d.isActive ? 'translate-x-4' : 'translate-x-0.5')} />
          </div>
        </button>
        <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-paper2 transition-colors text-ink2">
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
}

function DiscountForm({ value, onChange }: { value: DiscountDraft; onChange: (v: DiscountDraft) => void }) {
  const set = (k: keyof DiscountDraft, v: unknown) => onChange({ ...value, [k]: v });
  const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm text-ink bg-paper border border-diwan-gold/15 focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 transition-all';
  const labelCls = 'block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium mb-1.5';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Code</label>
          <input value={value.code} onChange={e => set('code', e.target.value.toUpperCase())} className={cn(inputCls, 'font-mono tracking-widest')} placeholder="SOMMER20" />
        </div>
        <div>
          <label className={labelCls}>Typ</label>
          <select value={value.type} onChange={e => set('type', e.target.value)} className={inputCls}>
            <option value="PERCENT">Prozent (%)</option>
            <option value="FIXED">Fixbetrag (€)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{value.type === 'PERCENT' ? 'Prozent' : 'Betrag (€)'}</label>
          <input type="number" min={0} step={value.type === 'PERCENT' ? 1 : 0.01} value={value.value || ''} onChange={e => set('value', Number(e.target.value))} className={inputCls} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>Mindestbestellung (€)</label>
          <input type="number" min={0} step={0.01} value={value.minSpend ?? ''} onChange={e => set('minSpend', e.target.value ? Number(e.target.value) : undefined)} className={inputCls} placeholder="—" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Beschreibung</label>
        <input value={value.description} onChange={e => set('description', e.target.value)} className={inputCls} placeholder="Interne Notiz…" />
      </div>
      <div>
        <label className={labelCls}>Gültig bis</label>
        <input type="date" value={value.expiresAt} onChange={e => set('expiresAt', e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export function Customers() {
  const qc = useQueryClient();
  const [tab,          setTab]          = useState<TabKey>('customers');
  const [search,       setSearch]       = useState('');
  const [customerSheet, setCustomerSheet] = useState(false);
  const [editCustomer,  setEditCustomer]  = useState<Customer | null>(null);
  const [discountSheet, setDiscountSheet] = useState(false);
  const [editDiscount,  setEditDiscount]  = useState<Discount | null>(null);
  const [discountForm,  setDiscountForm]  = useState<DiscountDraft>(DISCOUNT_EMPTY);

  const { data: customers = [], isLoading: cLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn:  customersApi.list,
  });

  const { data: discounts = [], isLoading: dLoading } = useQuery<Discount[]>({
    queryKey: ['discounts'],
    queryFn:  customersApi.discounts,
  });

  const saveDiscount = useMutation({
    mutationFn: () => editDiscount
      ? customersApi.updateDiscount(editDiscount.id, discountForm)
      : customersApi.createDiscount(discountForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discounts'] }); setDiscountSheet(false); setEditDiscount(null); setDiscountForm(DISCOUNT_EMPTY); },
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search),
  );

  function openEditDiscount(d: Discount) {
    setEditDiscount(d);
    setDiscountForm({ code: d.code, description: d.description ?? '', type: d.type, value: d.value, minSpend: d.minSpend, isActive: d.isActive, expiresAt: d.expiresAt ?? '' });
    setDiscountSheet(true);
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">Verwaltung</p>
          <h2 className="font-display text-ink text-2xl font-normal">Kunden & Rabatte</h2>
        </div>
        <button
          onClick={() => tab === 'customers' ? (setEditCustomer(null), setCustomerSheet(true)) : (setEditDiscount(null), setDiscountForm(DISCOUNT_EMPTY), setDiscountSheet(true))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 transition-colors"
        >
          <Plus size={15} /> {tab === 'customers' ? 'Kunde' : 'Rabattcode'}
        </button>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {([['customers', 'Kunden', Users], ['discounts', 'Rabattcodes', Tag]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              tab === key ? 'bg-diwan-gold text-diwan-bg' : 'bg-white text-ink2 border border-diwan-gold/10 hover:border-diwan-gold/25',
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Customers tab */}
      {tab === 'customers' && (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink2/50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, E-Mail oder Telefon…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-diwan-gold/15 text-sm text-ink placeholder-ink2/50 focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 transition-all"
            />
          </div>

          {cLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-paper2 animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users size={32} className="text-diwan-gold/30 mb-3" />
              <p className="font-semibold text-ink mb-1">{search ? 'Kein Ergebnis' : 'Noch keine Kunden'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map((c, i) => (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ ...springs.gentle, delay: i * 0.025 }}
                    onClick={() => { setEditCustomer(c); setCustomerSheet(true); }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 bg-white border border-diwan-gold/8 rounded-2xl text-left hover:border-diwan-gold/20 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-diwan-gold/15 flex items-center justify-center text-diwan-gold font-bold flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{c.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-ink2 mt-0.5">
                        {c.email && <span className="truncate">{c.email}</span>}
                        <span className="flex items-center gap-1 flex-shrink-0"><Star size={9} className="text-diwan-gold" />{c.points} Pkt.</span>
                        <span className="flex-shrink-0">{formatEur(c.totalSpend)}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-ink2/40 flex-shrink-0" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Discounts tab */}
      {tab === 'discounts' && (
        <>
          {dLoading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-2xl bg-paper2 animate-pulse" />)}</div>
          ) : discounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Tag size={32} className="text-diwan-gold/30 mb-3" />
              <p className="font-semibold text-ink mb-1">Keine Rabattcodes</p>
              <p className="text-xs text-ink2">Erstellen Sie den ersten Code</p>
            </div>
          ) : (
            <div className="space-y-2">
              {discounts.map(d => (
                <DiscountRow key={d.id} d={d} onEdit={() => openEditDiscount(d)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Customer sheet */}
      <BottomSheet
        isOpen={customerSheet}
        onClose={() => { setCustomerSheet(false); setEditCustomer(null); }}
        title={editCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}
      >
        <CustomerSheet
          customer={editCustomer}
          onClose={() => { setCustomerSheet(false); setEditCustomer(null); }}
        />
      </BottomSheet>

      {/* Discount sheet */}
      <BottomSheet
        isOpen={discountSheet}
        onClose={() => { setDiscountSheet(false); setEditDiscount(null); }}
        title={editDiscount ? 'Code bearbeiten' : 'Neuer Rabattcode'}
      >
        <div className="px-5 pb-8 space-y-5">
          <DiscountForm value={discountForm} onChange={setDiscountForm} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setDiscountForm(p => ({ ...p, isActive: !p.isActive }))}
                className={cn('w-10 h-5 rounded-full relative transition-colors', discountForm.isActive ? 'bg-diwan-gold' : 'bg-paper2 border border-diwan-gold/20')}
              >
                <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform', discountForm.isActive ? 'translate-x-5' : 'translate-x-0.5')} />
              </div>
              <span className="text-sm text-ink">Aktiv</span>
            </label>
          </div>
          <button
            onClick={() => saveDiscount.mutate()}
            disabled={saveDiscount.isPending || !discountForm.code || discountForm.value <= 0}
            className="w-full py-3 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 disabled:opacity-50 transition-colors"
          >
            {saveDiscount.isPending ? 'Wird gespeichert…' : editDiscount ? 'Code aktualisieren' : 'Code erstellen'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
