import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Haptic feedback ──────────────────────────────────────
export function haptic(type: 'tap' | 'success' | 'error' | 'warning') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const patterns: Record<typeof type, number[]> = {
    tap:     [8],
    success: [8, 60, 8],
    error:   [60],
    warning: [20, 40, 20],
  };
  navigator.vibrate(patterns[type]);
}

// ── Spring presets ────────────────────────────────────────
export const springs = {
  snap:    { type: 'spring' as const, stiffness: 500, damping: 32, mass: 1 },
  gentle:  { type: 'spring' as const, stiffness: 200, damping: 26, mass: 1 },
  bounce:  { type: 'spring' as const, stiffness: 320, damping: 18, mass: 1 },
  swoosh:  { type: 'spring' as const, stiffness: 140, damping: 22, mass: 1 },
  stiff:   { type: 'spring' as const, stiffness: 600, damping: 36, mass: 1 },
} as const;

// ── Formatters ───────────────────────────────────────────
export function formatEur(amount: number | string): string {
  return `€ ${Number(amount).toFixed(2).replace('.', ',')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export function orderAgeMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

// ── Initials avatar ──────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

// ── Role helpers ─────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  OWNER:   'Owner',
  MANAGER: 'Manager',
  WAITER:  'Service',
  KITCHEN: 'Küche',
};

export const ROLE_COLORS: Record<string, string> = {
  OWNER:   'bg-diwan-gold/20 text-diwan-gold border-diwan-gold/30',
  MANAGER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  WAITER:  'bg-green-500/10 text-green-600 border-green-500/20',
  KITCHEN: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

// ── JWT decode ────────────────────────────────────────────
export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded || typeof decoded.exp !== 'number') return true;
  return decoded.exp * 1000 < Date.now();
}
