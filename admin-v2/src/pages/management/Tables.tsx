import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, QrCode, RefreshCw, Tag, Users, Clock } from 'lucide-react';
import { tablesApi, ordersApi } from '@/lib/api';
import { cn, formatEur, formatRelativeTime, springs, haptic } from '@/lib/utils';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { HoldButton } from '@/components/primitives/HoldButton';
import type { Table, Order } from '@/types';

const STATUS_STYLES: Record<Table['status'], { border: string; bg: string; dot: string; label: string }> = {
  AVAILABLE: { border: 'border-green-200',  bg: 'bg-white',               dot: 'bg-green-400',  label: 'Frei'       },
  OCCUPIED:  { border: 'border-amber-300',  bg: 'bg-amber-50/60',         dot: 'bg-amber-400',  label: 'Belegt'     },
  RESERVED:  { border: 'border-blue-200',   bg: 'bg-blue-50/40',          dot: 'bg-blue-400',   label: 'Reserviert' },
};

function TableCard({ table, onClick }: { table: Table; onClick: () => void }) {
  const s = STATUS_STYLES[table.status];
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={springs.snap}
      className={cn(
        'relative flex flex-col items-start p-4 rounded-2xl border-2 text-left w-full',
        'shadow-warm-sm hover:shadow-warm-md transition-shadow duration-200',
        s.border, s.bg,
      )}
    >
      {/* Pulse for occupied */}
      {table.status === 'OCCUPIED' && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
        </span>
      )}
      {table.status !== 'OCCUPIED' && (
        <span className={cn('absolute top-3.5 right-3.5 w-2 h-2 rounded-full', s.dot)} />
      )}

      <div className="font-display text-5xl font-bold text-ink leading-none mb-2">
        {table.number}
      </div>

      <div className="flex items-center gap-1.5 text-ink2">
        <Users size={11} />
        <span className="text-xs">{table.seats} Plätze</span>
      </div>

      <div className={cn(
        'mt-2 text-[10px] font-bold uppercase tracking-wider',
        table.status === 'AVAILABLE' ? 'text-green-600' :
        table.status === 'OCCUPIED'  ? 'text-amber-700' : 'text-blue-600',
      )}>
        {s.label}
      </div>

      {table.label && (
        <div className="mt-1 text-[10px] text-ink2/60 truncate w-full">{table.label}</div>
      )}
    </motion.button>
  );
}

function TableDetailSheet({
  table, onClose, onTableChange,
}: { table: Table | null; onClose: () => void; onTableChange: (table: Table) => void }) {
  const qc = useQueryClient();
  const [labelDraft, setLabelDraft] = useState('');
  const [billMode, setBillMode] = useState<'total' | 'split'>('total');

  useEffect(() => {
    setLabelDraft(table?.label ?? '');
    setBillMode('total');
  }, [table?.id, table?.label]);

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders', 'table', table?.id],
    queryFn:  () => ordersApi.byTable(table!.id),
    enabled:  Boolean(table),
    refetchInterval: 8000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tablesApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      haptic('success');
      onClose();
    },
  });

  const labelMut = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      tablesApi.updateLabel(id, label),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      onTableChange(updated);
      haptic('success');
    },
  });

  const tokenMut = useMutation({
    mutationFn: (id: string) => tablesApi.regenerateToken(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      onTableChange(updated);
      haptic('success');
    },
  });

  const activeOrders = orders.filter(o => o.status !== 'PAID');
  const total = activeOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

  if (!table) return null;
  const currentTable = table;

  async function saveLabel() {
    if (!table || (labelDraft.trim() || '') === (table.label ?? '')) return;
    labelMut.mutate({ id: table.id, label: labelDraft });
  }

  async function payOrder(orderId: string) {
    await ordersApi.pay(orderId);
    haptic('success');
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['tables'] });
  }

  async function payAllOrders() {
    await Promise.all(activeOrders.map(o => ordersApi.pay(o.id)));
    haptic('success');
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['tables'] });
    onClose();
  }

  async function downloadQr(type: 'call' | 'order' = 'call') {
    const authToken = localStorage.getItem('diwanAdminToken') ?? sessionStorage.getItem('diwanAdminToken');
    const apiUrl = type === 'order' ? tablesApi.qrOrderUrl(currentTable.id) : tablesApi.qrUrl(currentTable.id);
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${authToken ?? ''}` },
    });
    if (!res.ok) throw new Error('QR download failed');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = `tisch-${currentTable.number}-qr-${type}.png`;
    a.click();
    URL.revokeObjectURL(objUrl);
  }

  const callUrl = table.qrToken
    ? `${window.location.origin}/call?t=${encodeURIComponent(table.qrToken)}`
    : '';

  const orderUrl = table.qrToken
    ? `${window.location.origin}/order?t=${encodeURIComponent(table.qrToken)}`
    : '';

  return (
    <BottomSheet isOpen={Boolean(table)} onClose={onClose} title={`Tisch ${table.number}`}>
      <div className="px-5 py-4 space-y-5">
        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {(['AVAILABLE', 'OCCUPIED', 'RESERVED'] as Table['status'][]).map(s => (
            <button
              key={s}
              onClick={() => statusMut.mutate({ id: table.id, status: s })}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                table.status === s
                  ? 'bg-diwan-gold text-diwan-bg border-diwan-gold'
                  : 'border-diwan-gold/20 text-ink2 hover:border-diwan-gold/40',
              )}
            >
              {STATUS_STYLES[s].label}
            </button>
          ))}
        </div>

        {/* Map annotation */}
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink2">
            <Tag size={11} />
            Tischname
          </span>
          <input
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={saveLabel}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            placeholder="Tischname..."
            className="w-full rounded-xl border border-diwan-gold/10 bg-paper px-3 py-2 text-sm text-ink outline-none transition focus:border-diwan-gold/40 focus:bg-white"
          />
        </label>

        {/* QR code tools */}
        <div className="rounded-xl border border-diwan-gold/10 bg-paper p-3.5 space-y-3">
          {/* Call QR */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <QrCode size={15} className="text-diwan-gold" />
                <div>
                  <p className="text-sm font-semibold text-ink">Kellner-rufen QR</p>
                  <p className="text-[11px] text-ink2">Für Tischschild oder Aufsteller</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => downloadQr('call')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-diwan-gold px-2.5 text-[11px] font-bold text-diwan-bg"
                >
                  <Download size={12} />
                  PNG
                </button>
                <button
                  onClick={() => tokenMut.mutate(table.id)}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-diwan-gold/15 px-2.5 text-ink2 hover:border-diwan-gold/40"
                  title="QR token erneuern"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
            {callUrl && (
              <p className="truncate rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-ink2">
                {callUrl}
              </p>
            )}
          </div>

          <div className="border-t border-diwan-gold/10" />

          {/* Order QR */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <QrCode size={15} className="text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-ink">Bestell-QR</p>
                  <p className="text-[11px] text-ink2">Gäste können direkt bestellen</p>
                </div>
              </div>
              <button
                onClick={() => downloadQr('order')}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-green-600 px-2.5 text-[11px] font-bold text-white"
              >
                <Download size={12} />
                PNG
              </button>
            </div>
            {orderUrl && (
              <p className="truncate rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-ink2">
                {orderUrl}
              </p>
            )}
          </div>
        </div>

        {/* Active orders */}
        {activeOrders.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink2 mb-3">Offene Bestellungen</h3>
            <div className="mb-3 inline-flex rounded-xl bg-paper2 p-1">
              {([
                ['total', 'Gesamtrechnung'],
                ['split', 'Aufteilen'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setBillMode(mode)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    billMode === mode ? 'bg-white text-ink shadow-warm-sm' : 'text-ink2',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-paper rounded-xl p-3.5 border border-diwan-gold/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-ink">#{order.orderNumber}</span>
                    <div className="flex items-center gap-1 text-ink2 text-xs">
                      <Clock size={11} />
                      {formatRelativeTime(order.createdAt)}
                    </div>
                  </div>
                  {order.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-xs text-ink2 py-0.5">
                      <span>{item.quantity}× {item.menuItem?.nameDe}</span>
                      <span>€ {(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold text-ink mt-2 pt-2 border-t border-paper2">
                    <span>Zwischensumme</span>
                    <span className="text-diwan-gold">{formatEur(order.totalAmount)}</span>
                  </div>
                  {billMode === 'split' && (
                    <div className="mt-3 flex justify-end">
                      <HoldButton
                        variant="success"
                        size="md"
                        onCommit={() => payOrder(order.id)}
                      >
                        Diese Bestellung zahlen
                      </HoldButton>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total + pay */}
            {billMode === 'total' && (
              <div className="mt-4 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs text-ink2">Gesamtbetrag</p>
                  <p className="text-2xl font-bold text-ink">{formatEur(total)}</p>
                </div>
                <HoldButton
                  variant="success"
                  size="lg"
                  onCommit={payAllOrders}
                >
                  Alles bezahlt
                </HoldButton>
              </div>
            )}
          </div>
        )}

        {activeOrders.length === 0 && (
          <div className="text-center py-8 text-ink2">
            <Grid3X3Icon className="mx-auto mb-2 opacity-30" size={28} />
            <p className="text-sm">Keine offenen Bestellungen</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// small placeholder icon
function Grid3X3Icon({ size, className }: { size?: number; className?: string }) {
  return <div style={{ width: size, height: size }} className={className} />;
}

export function Tables() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Table | null>(null);

  const { data: tables = [], isLoading, refetch } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn:  tablesApi.list,
    refetchInterval: 15_000,
  });

  const stats = {
    available: tables.filter(t => t.status === 'AVAILABLE').length,
    occupied:  tables.filter(t => t.status === 'OCCUPIED').length,
    reserved:  tables.filter(t => t.status === 'RESERVED').length,
  };

  return (
    <div className="p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-4">
          {[
            { label: 'Frei',       count: stats.available, color: 'text-green-600' },
            { label: 'Belegt',     count: stats.occupied,  color: 'text-amber-600' },
            { label: 'Reserviert', count: stats.reserved,  color: 'text-blue-600' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <p className={cn('text-xl font-bold tabular-nums', color)}>{count}</p>
              <p className="text-[10px] text-ink2 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-ink2 hover:text-diwan-gold transition-colors px-3 py-1.5 rounded-xl border border-diwan-gold/15 hover:border-diwan-gold/30"
        >
          <RefreshCw size={12} />
          Aktualisieren
        </button>
      </div>

      {/* Floor plan grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 bg-paper2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3"
        >
          <AnimatePresence>
            {tables.map((table, i) => (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springs.gentle, delay: i * 0.02 }}
              >
                <TableCard table={table} onClick={() => setSelected(table)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <TableDetailSheet
        table={selected}
        onTableChange={setSelected}
        onClose={() => { setSelected(null); qc.invalidateQueries({ queryKey: ['tables'] }); }}
      />
    </div>
  );
}
