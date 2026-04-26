import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'diwan_kds_sound';

type BrowserAudioContext = typeof AudioContext;

function getAudioContext(): BrowserAudioContext | undefined {
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: BrowserAudioContext }).webkitAudioContext;
}

export function useKdsSound() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const audioRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    const Ctx = getAudioContext();
    if (!Ctx) return;
    audioRef.current ??= new Ctx();
    audioRef.current.resume?.();
    unlockedRef.current = true;
  }, []);

  const beep = useCallback(() => {
    if (!enabled) return;
    unlock();
    const ctx = audioRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.2].forEach((offset) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.14);
    });
  }, [enabled, unlock]);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      if (next) unlock();
      return next;
    });
  }, [unlock]);

  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, unlock, { once: true, passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, unlock));
  }, [unlock]);

  useEffect(() => {
    const handleOrder = () => beep();
    window.addEventListener('diwan:kds-order', handleOrder);
    return () => window.removeEventListener('diwan:kds-order', handleOrder);
  }, [beep]);

  return { enabled, toggle, beep };
}
