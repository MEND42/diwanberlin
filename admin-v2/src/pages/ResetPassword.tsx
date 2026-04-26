import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { cn, springs } from '@/lib/utils';

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') ?? '', [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError('Der Link ist ungültig.'); return; }
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen haben.'); return; }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { state: { message: 'Passwort geändert. Bitte anmelden.' } }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passwort konnte nicht geändert werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #2c1a0a 0%, #180e04 50%, #0e0804 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springs.gentle}
        className="w-full max-w-[400px] rounded-2xl border border-white/8 p-8"
        style={{
          background: 'linear-gradient(160deg, rgba(44,26,10,0.92) 0%, rgba(24,14,4,0.96) 100%)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.52)',
        }}
      >
        <Link to="/login" className="inline-flex items-center gap-2 text-xs text-diwan-dim hover:text-diwan-cream mb-7">
          <ArrowLeft size={13} /> Zur Anmeldung
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-diwan-gold/15 flex items-center justify-center">
            {done ? <CheckCircle2 size={20} className="text-green-400" /> : <Lock size={18} className="text-diwan-gold" />}
          </div>
          <div>
            <p className="text-diwan-gold text-[10px] tracking-[0.2em] uppercase">Sicherheit</p>
            <h1 className="font-display text-diwan-cream text-2xl">Passwort setzen</h1>
          </div>
        </div>

        {done ? (
          <div className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
            Passwort gespeichert. Sie werden weitergeleitet.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-diwan-dim font-medium mb-1.5">Neues Passwort</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl px-4 py-3 text-sm text-diwan-cream bg-black/25 border border-white/10 focus:outline-none focus:border-diwan-gold/50"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-diwan-dim font-medium mb-1.5">Bestätigen</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl px-4 py-3 text-sm text-diwan-cream bg-black/25 border border-white/10 focus:outline-none focus:border-diwan-gold/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className={cn(
                'w-full rounded-xl py-3.5 text-sm font-semibold bg-diwan-gold text-diwan-bg hover:bg-diwan-gold2 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
