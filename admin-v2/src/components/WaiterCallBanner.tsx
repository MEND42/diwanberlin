import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X, Check } from 'lucide-react';

const AUTO_DISMISS_MS = 30_000;

interface WaiterCall {
  id: string;
  tableNumber: number;
  label?: string;
  arrivedAt: number;
}

export function WaiterCallBanner() {
  const [calls, setCalls] = useState<WaiterCall[]>([]);

  useEffect(() => {
    function handleCall(e: Event) {
      const detail = (e as CustomEvent).detail as {
        tableNumber: number;
        label?: string;
      };

      const call: WaiterCall = {
        id: Math.random().toString(36).slice(2),
        tableNumber: detail.tableNumber,
        label: detail.label ?? undefined,
        arrivedAt: Date.now(),
      };

      setCalls(prev => [call, ...prev]);

      // Haptic feedback on mobile
      if (navigator.vibrate) navigator.vibrate([30, 60, 30, 60, 30]);

      // Auto-dismiss
      const timer = setTimeout(() => {
        setCalls(prev => prev.filter(c => c.id !== call.id));
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    }

    window.addEventListener('diwan:waiter-call', handleCall);
    return () => window.removeEventListener('diwan:waiter-call', handleCall);
  }, []);

  function dismiss(id: string) {
    setCalls(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div
      className="fixed top-16 right-4 z-[500] flex flex-col gap-2 pointer-events-none"
      aria-live="assertive"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {calls.map(call => (
          <motion.div
            key={call.id}
            role="alert"
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #d97706, #f59e0b)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              padding: '12px 14px 12px 16px',
              minWidth: '220px',
              maxWidth: '300px',
            }}
          >
            {/* Animated bell */}
            <div className="flex-shrink-0">
              <BellRing
                size={22}
                className="text-amber-900"
                style={{ animation: 'bellRing 0.6s ease-in-out 2' }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-950 leading-tight">
                Tisch {call.tableNumber} ruft
              </p>
              {call.label && (
                <p className="text-xs text-amber-800 mt-0.5 truncate">{call.label}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => dismiss(call.id)}
                title="Bestätigen"
                className="w-7 h-7 rounded-lg bg-amber-950/15 hover:bg-amber-950/25 flex items-center justify-center transition-colors"
                aria-label="Ruf bestätigen"
              >
                <Check size={13} className="text-amber-950" />
              </button>
              <button
                onClick={() => dismiss(call.id)}
                title="Schließen"
                className="w-7 h-7 rounded-lg bg-amber-950/15 hover:bg-amber-950/25 flex items-center justify-center transition-colors"
                aria-label="Benachrichtigung schließen"
              >
                <X size={13} className="text-amber-950" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        @keyframes bellRing {
          0%,100% { transform: rotate(0deg); }
          15%      { transform: rotate(-18deg); }
          30%      { transform: rotate(18deg); }
          45%      { transform: rotate(-14deg); }
          60%      { transform: rotate(14deg); }
          75%      { transform: rotate(-8deg); }
          90%      { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}
