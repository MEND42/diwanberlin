import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, RefreshCw } from 'lucide-react';
import { tablesApi, ordersApi, menuApi } from '@/lib/api';
import { cn, springs, haptic, formatEur } from '@/lib/utils';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { HoldButton } from '@/components/primitives/HoldButton';
import type { Table, Order, MenuCategory } from '@/types';

const STATUS_CONFIG: Record<Table['status'], { ring: string; glow?: string; label: string; textColor: string }> = {
  AVAILABLE: { ring: 'ring-2 ring-green-300/60',   label: 'Frei',       textColor: 'text-green-600' },
  OCCUPIED:  { ring: 'ring-2 ring-amber-400',       glow: 'shadow-[0_0_0_6px_rgba(251,191,36,0.15)]', label: 'Belegt', textColor: 'text-amber-700' },
  RESERVED:  { ring: 'ring-2 ring-blue-300/60',    label: 'Reserviert', textColor: 'text-blue-600' },
};

function TableTile({ table, onTap }: { table: Table; onTap: () => void }) {
  const cfg = STATUS_CONFIG[table.status];
  return (
    <motion.button
      onClick={() => { haptic('tap'); onTap(); }}
      whileTap={{ scale: 0.93 }}
      transition={springs.snap}
      className={cn(
        'relative flex flex-col items-center justify-center aspect-square rounded-2xl bg-white',
        'border border-paper2 transition-shadow',
        cfg.ring, cfg.glow,
      )}
    >
      {/* Occupied pulse ring */}
      {table.status === 'OCCUPIED' && (
        <span className="absolute inset-0 rounded-2xl border-2 border-amber-400/40 animate-ping" />
      )}

      <span className="font-display text-4xl font-bold text-ink leading-none">{table.number}</span>
      <span className="flex items-center gap-1 text-[10px] text-ink2 mt-1">
        <Users size={9} />{table.seats}
      </span>
      <span className={cn('text-[9px] font-bold uppercase tracking-wider mt-1', cfg.textColor)}>
        {cfg.label}
      </span>
    </motion.button>
  );
}

interface OrderDraft { menuItemId: string; nameDe: string; price: number; qty: number; }

function TableSheet({ table, onClose }: { table: Table | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'bill' | 'order'>('bill');
  const [draft, setDraft] = useState<OrderDraft[]>([]);
  const [catId, setCatId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders', 'table', table?.id],
    queryFn:  () => ordersApi.byTable(table!.id),
    enabled:  Boolean(table && tab === 'bill'),
    refetchInterval: 6000,
  });

  const { data: cats = [] } = useQuery<MenuCategory[]>({
    queryKey: ['menu-categories'],
    queryFn:  menuApi.categories,
    enabled:  Boolean(table && tab === 'order'),
  });

  if (!table) return null;

  const activeOrders = orders.filter(o => o.status !== 'PAID');
  const billTotal = activeOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const draftTotal = draft.reduce((s, d) => s + d.price * d.qty, 0);
  const currentCat = cats.find(c => c.id === catId) ?? cats[0];

  function addItem(id: string, name: string, price: number) {
    haptic('tap');
    setDraft(prev => {
      const existing = prev.find(d => d.menuItemId === id);
      if (existing) return prev.map(d => d.menuItemId === id ? { ...d, qty: d.qty + 1 } : d);
      return [...prev, { menuItemId: id, nameDe: name, price, qty: 1 }];
    });
  }

  function removeItem(id: string) {
    setDraft(prev => prev
      .map(d => d.menuItemId === id ? { ...d, qty: d.qty - 1 } : d)
      .filter(d => d.qty > 0),
    );
  }

  async function submitOrder() {
    if (!draft.length) return;
    setSubmitting(true);
    try {
      await ordersApi.create({
        tableId: table.id,
        items: draft.map(d => ({ menuItemId: d.menuItemId, quantity: d.qty, unitPrice: d.price })),
      });
      haptic('success');
      setDraft([]);
      setTab('bill');
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
    } catch { haptic('error'); }
    finally { setSubmitting(false); }
  }

  return (
    <BottomSheet isOpen={Boolean(table)} onClose={onClose} title={`Tisch ${table.number}`}>
      {/* Tab switcher */}
      <div className="flex px-5 pt-2 pb-3 gap-2">
        {(['bill', 'order'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
              tab === t
                ? 'bg-diwan-gold text-diwan-bg shadow-md'
                : 'bg-paper2 text-ink2 hover:bg-paper',
            )}
          >
            {t === 'bill' ? 'Rechnung' : 'Bestellen'}
          </button>
        ))}
      </div>

      {tab === 'bill' && (
        <div className="px-5 pb-6">
          {activeOrders.length === 0 ? (
            <p className="text-center text-ink2 text-sm py-10">Keine offenen Bestellungen</p>
          ) : (
            <>
              {activeOrders.map(order => (
                <div key={order.id} className="mb-4 rounded-xl bg-paper p-3.5 border border-paper2">
                  <p className="text-xs font-semibold text-ink mb-2">Bestellung #{order.orderNumber}</p>
                  {order.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-xs text-ink2 py-0.5">
                      <span>{item.quantity}× {item.menuItem?.nameDe}</span>
                      <span>{formatEur(Number(item.unitPrice) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-ink2">Gesamtbetrag</p>
                  <p className="text-2xl font-bold text-ink">{formatEur(billTotal)}</p>
                </div>
                <HoldButton
                  variant="success"
                  size="lg"
                  onCommit={() => {
                    activeOrders.forEach(o => ordersApi.pay(o.id));
                    qc.invalidateQueries({ queryKey: ['orders'] });
                    qc.invalidateQueries({ queryKey: ['tables'] });
                    onClose();
                  }}
                >
                  Bezahlt ✓
                </HoldButton>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'order' && (
        <div className="pb-6">
          {/* Category pills */}
          <div className="flex gap-2 px-5 overflow-x-auto pb-2 scrollbar-none">
            {cats.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCatId(cat.id)}
                className={cn(
                  'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                  (catId ? catId === cat.id : cats[0]?.id === cat.id)
                    ? 'bg-diwan-gold text-diwan-bg'
                    : 'bg-paper2 text-ink2',
                )}
              >
                {cat.nameDe}
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="px-5 mt-3 space-y-1.5 max-h-52 overflow-y-auto">
            {currentCat?.items.filter(i => i.isAvailable).map(item => {
              const inDraft = draft.find(d => d.menuItemId === item.id);
              return (
                <div key={item.id} className="flex items-center justify-between bg-white rounded-xl px-3.5 py-2.5 border border-paper2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.nameDe}</p>
                    <p className="text-xs text-diwan-gold">{formatEur(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {inDraft ? (
                      <>
                        <button onClick={() => removeItem(item.id)}
                          className="w-6 h-6 rounded-full bg-paper2 text-ink text-sm flex items-center justify-center font-bold">−</button>
                        <span className="text-sm font-bold text-ink w-4 text-center">{inDraft.qty}</span>
                        <button onClick={() => addItem(item.id, item.nameDe, Number(item.price))}
                          className="w-6 h-6 rounded-full bg-diwan-gold text-diwan-bg text-sm flex items-center justify-center font-bold">+</button>
                      </>
                    ) : (
                      <button onClick={() => addItem(item.id, item.nameDe, Number(item.price))}
                        className="w-7 h-7 rounded-full bg-diwan-gold/15 text-diwan-gold flex items-center justify-center hover:bg-diwan-gold hover:text-diwan-bg transition-colors">
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Draft summary + submit */}
          {draft.length > 0 && (
            <div className="mx-5 mt-4 pt-4 border-t border-paper2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-ink2">{draft.reduce((s,d) => s + d.qty, 0)} Artikel</p>
                  <p className="text-lg font-bold text-ink">{formatEur(draftTotal)}</p>
                </div>
                <HoldButton
                  variant="primary"
                  size="md"
                  loading={submitting}
                  onCommit={submitOrder}
                >
                  Bestellen
                </HoldButton>
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

export function FloorPlan() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Table | null>(null);

  const { data: tables = [], isLoading, refetch } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn:  tablesApi.list,
    refetchInterval: 12_000,
  });

  return (
    <div className="h-full flex flex-col">
      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-paper2">
        <div className="flex gap-4 text-center">
          {[
            { label: 'Frei',   count: tables.filter(t => t.status === 'AVAILABLE').length, color: 'text-green-600' },
            { label: 'Belegt', count: tables.filter(t => t.status === 'OCCUPIED').length,  color: 'text-amber-600' },
          ].map(({ label, count, color }) => (
            <div key={label}>
              <p className={cn('text-lg font-bold', color)}>{count}</p>
              <p className="text-[9px] uppercase tracking-wide text-ink2">{label}</p>
            </div>
          ))}
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-xl hover:bg-paper2 transition-colors text-ink2">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Table grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-paper2 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            <AnimatePresence>
              {tables.map((table, i) => (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springs.gentle, delay: i * 0.025 }}
                >
                  <TableTile table={table} onTap={() => setSelected(table)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <TableSheet
        table={selected}
        onClose={() => { setSelected(null); qc.invalidateQueries({ queryKey: ['tables'] }); }}
      />
    </div>
  );
}
