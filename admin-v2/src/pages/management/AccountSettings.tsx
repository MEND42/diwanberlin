import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Smartphone } from 'lucide-react';
import { useAuth }     from '@/hooks/useAuth';
import { useAppStore } from '@/store/appStore';
import { cn, springs, getInitials, ROLE_LABELS } from '@/lib/utils';
import { authApi }     from '@/lib/api';

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
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
          <div className="space-y-3">
            {[
              { label: 'Neue Reservierungen',   key: 'notif_reservations' },
              { label: 'Neue Event-Anfragen',   key: 'notif_events' },
              { label: 'Bestellungen bereit',   key: 'notif_orders' },
            ].map(({ label, key }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-ink group-hover:text-diwan-gold transition-colors">{label}</span>
                <div className="w-10 h-5.5 rounded-full bg-diwan-gold relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </label>
            ))}
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
        </Section>
      </motion.div>
    </div>
  );
}
