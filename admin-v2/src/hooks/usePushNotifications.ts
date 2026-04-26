import { useCallback, useEffect, useState } from 'react';
import { pushApi } from '@/lib/api';

type PushState = 'unsupported' | 'blocked' | 'inactive' | 'active' | 'loading';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function supportsPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('inactive');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!supportsPush()) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('blocked');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setState(subscription ? 'active' : 'inactive');
  }, []);

  useEffect(() => {
    refresh().catch(() => setState('inactive'));
  }, [refresh]);

  const enable = useCallback(async () => {
    setError('');
    if (!supportsPush()) {
      setState('unsupported');
      return;
    }
    setState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setState('blocked');
        return;
      }
      if (permission !== 'granted') {
        setState('inactive');
        return;
      }

      const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      const { publicKey } = envKey ? { publicKey: envKey } : await pushApi.publicKey();
      if (!publicKey) throw new Error('VAPID public key missing');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await pushApi.subscribe(subscription.toJSON());
      setState('active');
    } catch (err) {
      setState('inactive');
      setError(err instanceof Error ? err.message : 'Push konnte nicht aktiviert werden.');
    }
  }, []);

  const disable = useCallback(async () => {
    setError('');
    if (!supportsPush()) {
      setState('unsupported');
      return;
    }
    setState('loading');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;
      if (subscription) await subscription.unsubscribe();
      await pushApi.unsubscribe(endpoint);
      setState('inactive');
    } catch (err) {
      setState('inactive');
      setError(err instanceof Error ? err.message : 'Push konnte nicht deaktiviert werden.');
    }
  }, []);

  return {
    state,
    error,
    active: state === 'active',
    loading: state === 'loading',
    enable,
    disable,
    refresh,
  };
}
