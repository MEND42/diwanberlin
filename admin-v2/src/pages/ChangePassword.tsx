import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { springs, cn } from '@/lib/utils';

export function ChangePassword() {
  const { changePassword, user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const mismatch = next && confirm && next !== confirm;
  const weak     = next.length > 0 && next.length < 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError('Passwörter stimmen nicht überein.'); return; }
    setLoading(true);
    setError('');
    try {
      await changePassword(current, next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Ändern des Passworts.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.gentle}
        className="w-full max-w-md bg-white rounded-2xl shadow-warm-lg border border-diwan-gold/10 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-diwan-gold/12 flex items-center justify-center">
            <KeyRound size={18} className="text-diwan-gold" />
          </div>
          <div>
            <h1 className="font-display text-ink text-xl">Passwort ändern</h1>
            <p className="text-xs text-ink2 mt-0.5">Hallo {user?.displayName ?? user?.username} — bitte setzen Sie ein neues Passwort.</p>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Aktuelles Passwort', value: current, set: setCurrent, auto: 'current-password' },
            { label: 'Neues Passwort',     value: next,    set: setNext,    auto: 'new-password' },
            { label: 'Bestätigen',         value: confirm, set: setConfirm, auto: 'new-password' },
          ].map(({ label, value, set, auto }) => (
            <div key={label} className="space-y-1.5">
              <label className="block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium">{label}</label>
              <input
                type="password"
                value={value}
                onChange={e => set(e.target.value)}
                required
                autoComplete={auto}
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm text-ink bg-paper border',
                  'focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 focus:border-diwan-gold/50 transition-all',
                  mismatch && label === 'Bestätigen' ? 'border-red-300' : 'border-diwan-gold/15',
                )}
              />
            </div>
          ))}

          {weak && <p className="text-xs text-amber-600">Mindestens 8 Zeichen erforderlich.</p>}

          <button
            type="submit"
            disabled={loading || !current || !next || !confirm || !!mismatch || weak}
            className="w-full rounded-xl bg-diwan-gold text-diwan-bg font-semibold py-3 text-sm hover:bg-diwan-gold2 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
