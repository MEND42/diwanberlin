import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn, haptic } from '@/lib/utils';

interface HoldButtonProps {
  onCommit: () => void;
  holdDuration?: number;
  variant?: 'primary' | 'danger' | 'success' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const VARIANTS = {
  primary: 'bg-diwan-gold text-diwan-bg hover:bg-diwan-gold2',
  danger:  'bg-red-500 text-white hover:bg-red-600',
  success: 'bg-green-500 text-white hover:bg-green-600',
  outline: 'border border-diwan-gold/30 text-ink hover:bg-paper2 bg-transparent',
};

const RING_COLORS = {
  primary: '#c8922a',
  danger:  '#ef4444',
  success: '#22c55e',
  outline: '#c8922a',
};

const SIZES = {
  sm: 'px-3 py-2 text-xs rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-sm rounded-2xl',
};

const R = 20;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function HoldButton({
  onCommit,
  holdDuration = 700,
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'md',
  children,
  className,
}: HoldButtonProps) {
  const progress  = useMotionValue(0);
  const dashOffset = useTransform(progress, [0, 1], [CIRCUMFERENCE, 0]);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef<number>(0);
  const [holding, setHolding] = useState(false);
  const [done,    setDone]    = useState(false);

  const resetProgress = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    animate(progress, 0, { duration: 0.25, ease: 'easeOut' });
    setHolding(false);
  }, [progress]);

  const startHold = useCallback(() => {
    if (disabled || loading || done) return;
    setHolding(true);
    haptic('tap');
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / holdDuration, 1);
      progress.set(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setHolding(false);
        setDone(true);
        haptic('success');
        onCommit();
        setTimeout(() => {
          setDone(false);
          animate(progress, 0, { duration: 0.3 });
        }, 800);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, loading, done, holdDuration, progress, onCommit]);

  const ringColor = RING_COLORS[variant];

  return (
    <motion.button
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-semibold select-none',
        'transition-colors duration-150 overflow-hidden',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        done && 'opacity-80',
        className,
      )}
      disabled={disabled || loading}
      onPointerDown={startHold}
      onPointerUp={resetProgress}
      onPointerLeave={resetProgress}
      onPointerCancel={resetProgress}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      {/* Progress ring overlay */}
      {(holding || done) && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ borderRadius: 'inherit' }}
        >
          <motion.rect
            x="2" y="2"
            width="calc(100% - 4px)"
            height="calc(100% - 4px)"
            rx="10"
            fill="none"
            stroke={ringColor}
            strokeWidth="2.5"
            strokeDasharray={CIRCUMFERENCE}
            style={{ strokeDashoffset: dashOffset }}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Shimmer fill on complete */}
      {done && (
        <motion.div
          className="absolute inset-0 bg-white/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 0.6 }}
        />
      )}

      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
          className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full"
        />
      ) : children}

      {/* Hold hint text */}
      {holding && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-wide uppercase"
          style={{ background: 'rgba(0,0,0,0.1)' }}
        >
          Halten…
        </motion.span>
      )}
    </motion.button>
  );
}
