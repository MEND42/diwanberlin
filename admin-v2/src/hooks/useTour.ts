import { useCallback, useEffect, useMemo, useState } from 'react';

export interface TourStep {
  target: string;
  title: string;
  body: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_DONE_KEY = 'diwan_tour_done';
const TOUR_PENDING_KEY = 'diwan_tour_pending';

export function useTour() {
  const steps = useMemo<TourStep[]>(() => [
    {
      target: '[data-tour="dashboard-overview"]',
      title: 'Dashboard Überblick',
      body: 'Hier sehen Sie Bestellungen, belegte Tische, Reservierungen und Tagesumsatz auf einen Blick.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="quick-actions"]',
      title: 'Schnellzugriff',
      body: 'Diese Aktionen bringen Sie direkt zu den wichtigsten Arbeitsbereichen im Alltag.',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-reservations"]',
      title: 'Reservierungen',
      body: 'Neue Anfragen erscheinen hier mit Badge. Öffnen, prüfen, bestätigen oder einem Tisch zuweisen.',
      placement: 'right',
    },
    {
      target: '[data-tour="shell-switcher"]',
      title: 'Modus wechseln',
      body: 'Wechseln Sie zwischen Verwaltung und Service, ohne sich neu anzumelden.',
      placement: 'right',
    },
    {
      target: '[data-tour="notifications"]',
      title: 'Live Hinweise',
      body: 'Bestellungen, Reservierungen und Kellner-Rufe sammeln sich hier als Live-Benachrichtigungen.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="account-settings"]',
      title: 'Konto & App',
      body: 'Hier ändern Sie Passwort, Push-Benachrichtigungen und können diese Tour später neu starten.',
      placement: 'top',
    },
  ], []);

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  const start = useCallback(() => {
    setIndex(0);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(TOUR_DONE_KEY, '1');
    localStorage.removeItem(TOUR_PENDING_KEY);
    setActive(false);
  }, []);

  const restart = useCallback(() => {
    localStorage.removeItem(TOUR_DONE_KEY);
    localStorage.setItem(TOUR_PENDING_KEY, '1');
    start();
  }, [start]);

  const next = useCallback(() => {
    setIndex((current) => {
      if (current >= steps.length - 1) {
        localStorage.setItem(TOUR_DONE_KEY, '1');
        localStorage.removeItem(TOUR_PENDING_KEY);
        setActive(false);
        return current;
      }
      return current + 1;
    });
  }, [steps.length]);

  useEffect(() => {
    const shouldStart = !localStorage.getItem(TOUR_DONE_KEY) && localStorage.getItem(TOUR_PENDING_KEY) === '1';
    if (shouldStart) {
      const id = window.setTimeout(start, 500);
      return () => window.clearTimeout(id);
    }
  }, [start]);

  useEffect(() => {
    const handleRestart = () => restart();
    window.addEventListener('diwan:restart-tour', handleRestart);
    return () => window.removeEventListener('diwan:restart-tour', handleRestart);
  }, [restart]);

  return {
    active,
    index,
    step: steps[index],
    steps,
    next,
    finish,
    restart,
  };
}
