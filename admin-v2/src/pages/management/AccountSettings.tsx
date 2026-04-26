import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Smartphone, ExternalLink, type LucideIcon } from 'lucide-react';
import { useAuth }     from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAppStore } from '@/store/appStore';
import { cn, springs, getInitials, ROLE_LABELS } from '@/lib/utils';
import { authApi }     from '@/lib/api';

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-diwan-gold/8 shadow-warm-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-paper2">
        <div className="w-8 h-8 rounded-xl bg-diwan-gold/10 flex items-center justify-center">
          <Icon size={15} className="text-diwan-gold" />
        </div>
        <h3 className="font-semibold text-ink text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function AccountSettings() {
  const { user, changePassword } = useAuth();
  const push = usePushNotifications();
  const setUser = useAppStore(s => s.setUser);

  const [displayName, setDisplayName] = useState(user?.displayName ?? user?.username ?? '');
  const [nameSaved,   setNameSaved]   = useState(false);

  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [pwLoading,   setPwLoading]   = useState(false);
  const [pwError,     setPwError]     = useState('');
  const [pwSuccess,   setPwSuccess]   = useState(false);

  async function handleNameSave() {
    setUser({ displayName });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwError('Passwörter stimmen nicht überein.'); return; }
    if (newPw.length < 8)    { setPwError('Mindestens 8 Zeichen erforderlich.'); return; }
    setPwLoading(true);
    setPwError('');
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Fehler beim Ändern des Passworts.');
    } finally {
      setPwLoading(false);
    }
  }

  function restartTour() {
    localStorage.removeItem('diwan_tour_done');
    localStorage.setItem('diwan_tour_pending', '1');
    window.dispatchEvent(new CustomEvent('diwan:restart-tour'));
  }

  const inputClass = cn(
    'w-full rounded-xl px-4 py-2.5 text-sm text-ink bg-paper border border-diwan-gold/15',
    'focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 focus:border-diwan-gold/40 transition-all',
  );

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springs.gentle}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">Konto</p>
        <h2 className="font-display text-ink text-2xl font-normal">Einstellungen</h2>
      </motion.div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.gentle, delay: 0.05 }}>
        <Section title="Profil" icon={User}>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-diwan-gold/20 flex items-center justify-center text-diwan-gold text-xl font-bold flex-shrink-0">
              {getInitials(displayName || user?.username || 'A')}
            </div>
            <div>
              <p className="font-semibold text-ink">{user?.displayName ?? user?.username}</p>
              <p className="text-xs text-ink2">{ROLE_LABELS[user?.role ?? '']} · {user?.username}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium mb-1.5">
                Anzeigename
              </label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className={inputClass}
                placeholder="Ihr Name"
              />
            </div>
            <button
              onClick={handleNameSave}
              className="rounded-xl bg-diwan-gold text-diwan-bg px-5 py-2 text-sm font-semibold hover:bg-diwan-gold2 transition-colors"
            >
              {nameSaved ? '✓ Gespeichert' : 'Speichern'}
            </button>
          </div>
        </Section>
      </motion.div>

      {/* Password */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.gentle, delay: 0.1 }}>
        <Section title="Passwort ändern" icon={Lock}>
          {pwSuccess && (
            <div className="mb-4 rounded-xl px-4 py-3 bg-green-50 text-green-700 text-sm border border-green-200">
              ✓ Passwort erfolgreich geändert.
            </div>
          )}
          {pwError && (
            <div className="mb-4 rounded-xl px-4 py-3 bg-red-50 text-red-600 text-sm border border-red-200">
              {pwError}
            </div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {[
              { label: 'Aktuelles Passwort', value: currentPw, set: setCurrentPw, auto: 'current-password' },
              { label: 'Neues Passwort',     value: newPw,    set: setNewPw,    auto: 'new-password' },
              { label: 'Bestätigen',         value: confirmPw, set: setConfirmPw, auto: 'new-password' },
            ].map(({ label, value, set, auto }) => (
              <div key={label}>
                <label className="block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium mb-1.5">{label}</label>
                <input type="password" value={value} onChange={e => set(e.target.value)}
                  required autoComplete={auto} className={inputClass} />
              </div>
            ))}
            <button
              type="submit"
              disabled={pwLoading || !currentPw || !newPw || !confirmPw}
              className="rounded-xl bg-diwan-gold text-diwan-bg px-5 py-2 text-sm font-semibold hover:bg-diwan-gold2 disabled:opacity-40 transition-colors"
            >
              {pwLoading ? 'Wird gespeichert…' : 'Passwort ändern'}
            </button>
          </form>
        </Section>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.gentle, delay: 0.15 }}>
        <Section title="Benachrichtigungen" icon={Bell}>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">Push-Benachrichtigungen</p>
                <p className="mt-1 text-xs leading-5 text-ink2">
                  Erhalten Sie wichtige Hinweise auch dann, wenn die Admin-App im Hintergrund ist.
                </p>
              </div>
              <button
                type="button"
                disabled={push.loading || push.state === 'unsupported' || push.state === 'blocked'}
                onClick={push.active ? push.disable : push.enable}
                className={cn(
                  'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50',
                  push.active ? 'bg-diwan-gold' : 'bg-paper2',
                )}
                aria-pressed={push.active}
              >
                <span className={cn(
                  'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  push.active ? 'translate-x-6' : 'translate-x-1',
                )} />
              </button>
            </div>

            <div className="rounded-xl border border-diwan-gold/10 bg-paper px-4 py-3 text-xs text-ink2">
              {push.state === 'active' && 'Aktiviert: Neue Bestellungen, Reservierungen, Event-Anmeldungen und Kellner-Rufe werden als Push gesendet.'}
              {push.state === 'inactive' && 'Nicht aktiviert. Aktivieren Sie Push, damit dieses Gerät Benachrichtigungen empfangen kann.'}
              {push.state === 'loading' && 'Wird aktualisiert...'}
              {push.state === 'blocked' && 'Benachrichtigungen sind im Browser blockiert. Bitte in den Browser-Einstellungen erlauben.'}
              {push.state === 'unsupported' && 'Dieser Browser unterstützt Web Push nicht vollständig.'}
              {push.error && <p className="mt-2 text-red-600">{push.error}</p>}
            </div>
          </div>
        </Section>
      </motion.div>

      {/* PWA install hint */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.gentle, delay: 0.2 }}>
        <Section title="App installieren" icon={Smartphone}>
          <p className="text-sm text-ink2 mb-3">
            Installieren Sie das Admin-Dashboard als App auf Ihrem Telefon oder Tablet — für schnelleren Zugriff und Vollbild-Erlebnis.
          </p>
          <p className="text-xs text-ink2/60">
            Safari / Chrome: „Zum Home-Bildschirm hinzufügen" im Browser-Menü.
          </p>
          <button
            type="button"
            onClick={restartTour}
            className="mt-4 rounded-xl border border-diwan-gold/20 px-4 py-2 text-sm font-semibold text-diwan-gold hover:border-diwan-gold/45 hover:bg-diwan-gold/5 transition-colors"
          >
            Tour neu starten
          </button>
        </Section>
      </motion.div>

      {/* Gandom AI credit */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.gentle, delay: 0.25 }}>
        <div className="overflow-hidden rounded-2xl border border-diwan-gold/15 bg-[#050505] shadow-warm-sm">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <img
              src="/uploads/partners/gandom-ai-logo.png"
              alt="Gandom AI"
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-diwan-gold/20"
            />
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-diwan-gold">Entwicklung & Support</p>
              <h3 className="mt-1 font-display text-xl text-diwan-cream">Developed by Gandom AI</h3>
              <p className="mt-1 text-sm leading-6 text-diwan-dim">
                Dieses Admin-Portal und das operative Backend-System wurden von Gandom AI entwickelt.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="https://www.gandomai.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-diwan-gold px-3 py-2 text-xs font-bold text-diwan-bg"
                >
                  Website <ExternalLink size={12} />
                </a>
                <a
                  href="https://www.youtube.com/@GandomAI"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-diwan-gold/25 px-3 py-2 text-xs font-bold text-diwan-cream hover:bg-white/5"
                >
                  YouTube <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
