import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { springs, cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-diwan-bg/70 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={springs.snap}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-sm rounded-2xl border border-diwan-gold/12 bg-white p-5 shadow-warm-lg"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl',
                danger ? 'bg-red-50 text-red-600' : 'bg-diwan-gold/10 text-diwan-gold',
              )}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 id="confirm-dialog-title" className="text-base font-bold text-ink">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-ink2">{description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl border border-diwan-gold/15 px-4 py-2.5 text-sm font-semibold text-ink2 hover:border-diwan-gold/35 hover:text-ink disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50',
                  danger ? 'bg-red-600 hover:bg-red-700' : 'bg-diwan-gold text-diwan-bg hover:bg-diwan-gold2',
                )}
              >
                {loading ? 'Wird gelöscht…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
