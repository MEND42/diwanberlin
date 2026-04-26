import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  onAction: () => void;
}

interface SwipeRowProps {
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

const THRESHOLD   = 80;
const MAX_DRAG    = 120;

export function SwipeRow({
  leftAction,
  rightAction,
  children,
  className,
  threshold = THRESHOLD,
}: SwipeRowProps) {
  const x       = useMotionValue(0);
  const isDragging = useRef(false);

  const leftOpacity  = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const leftScale    = useTransform(x, [0, threshold], [0.7, 1]);
  const rightScale   = useTransform(x, [-threshold, 0], [1, 0.7]);

  function handleDragEnd() {
    const current = x.get();
    isDragging.current = false;

    if (current > threshold && leftAction) {
      leftAction.onAction();
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 28 });
    } else if (current < -threshold && rightAction) {
      rightAction.onAction();
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 28 });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 28 });
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left action reveal */}
      {leftAction && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-center px-5"
          style={{ background: leftAction.bg, opacity: leftOpacity, scale: leftScale }}
        >
          <div className="flex flex-col items-center gap-1">
            <span style={{ color: leftAction.color }}>{leftAction.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: leftAction.color }}>
              {leftAction.label}
            </span>
          </div>
        </motion.div>
      )}

      {/* Right action reveal */}
      {rightAction && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center px-5"
          style={{ background: rightAction.bg, opacity: rightOpacity }}
        >
          <div className="flex flex-col items-center gap-1">
            <span style={{ color: rightAction.color }}>{rightAction.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: rightAction.color }}>
              {rightAction.label}
            </span>
          </div>
        </motion.div>
      )}

      {/* Draggable row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: rightAction ? -MAX_DRAG : 0, right: leftAction ? MAX_DRAG : 0 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-white"
      >
        {children}
      </motion.div>
    </div>
  );
}
