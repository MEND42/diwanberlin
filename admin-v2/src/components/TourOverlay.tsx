import { useEffect, useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '@/lib/utils';
import type { TourStep } from '@/hooks/useTour';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTooltipPosition(rect: Rect, placement: TourStep['placement']) {
  const margin = 18;
  const width = Math.min(340, window.innerWidth - 32);
  const positions = {
    top: {
      top: Math.max(16, rect.top - 190),
      left: Math.min(window.innerWidth - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2)),
    },
    bottom: {
      top: Math.min(window.innerHeight - 180, rect.top + rect.height + margin),
      left: Math.min(window.innerWidth - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2)),
    },
    left: {
      top: Math.min(window.innerHeight - 180, Math.max(16, rect.top + rect.height / 2 - 82)),
      left: Math.max(16, rect.left - width - margin),
    },
    right: {
      top: Math.min(window.innerHeight - 180, Math.max(16, rect.top + rect.height / 2 - 82)),
      left: Math.min(window.innerWidth - width - 16, rect.left + rect.width + margin),
    },
  };
  return { ...positions[placement], width };
}

export function TourOverlay({
  active,
  step,
  index,
  total,
  onNext,
  onSkip,
}: {
  active: boolean;
  step?: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if (!active || !step) return;
    const currentStep = step;

    function update() {
      const target = document.querySelector(currentStep.target);
      if (!target) {
        setRect(null);
        return;
      }
      const box = target.getBoundingClientRect();
      setRect({
        top: box.top - 8,
        left: box.left - 8,
        width: box.width + 16,
        height: box.height + 16,
      });
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const id = window.setTimeout(update, 160);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.clearTimeout(id);
    };
  }, [active, step, index]);

  useEffect(() => {
    if (!active) return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [active, onSkip]);

  const tip = rect && step ? getTooltipPosition(rect, step.placement) : null;

  return (
    <AnimatePresence>
      {active && step && (
        <motion.div
          className="fixed inset-0 z-[100] pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[#120904]/72 backdrop-blur-[2px]" />

          {rect && (
            <motion.div
              layout
              className="absolute rounded-2xl border-2 border-diwan-gold shadow-[0_0_0_9999px_rgba(18,9,4,0.68),0_0_34px_rgba(200,146,42,0.45)]"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
              transition={springs.snap}
            />
          )}

          <motion.div
            className="absolute rounded-2xl border border-diwan-gold/35 bg-[#fff8ec] p-5 shadow-warm-lg"
            style={{
              top: tip?.top ?? '50%',
              left: tip?.left ?? '50%',
              width: tip?.width ?? 320,
              transform: tip ? undefined : 'translate(-50%, -50%)',
            }}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={springs.snap}
          >
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-diwan-gold">
              {index + 1} / {total}
            </p>
            <h3 className="font-display text-xl text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink2">{step.body}</p>
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-semibold text-ink2 hover:text-ink"
              >
                Überspringen
              </button>
              <button
                type="button"
                onClick={onNext}
                className="rounded-xl bg-diwan-gold px-4 py-2 text-sm font-bold text-diwan-bg"
              >
                {index + 1 === total ? 'Fertig' : 'Weiter'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
