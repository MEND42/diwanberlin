import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { springs, cn } from '@/lib/utils';

const grain = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`;

export function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const redirectMessage = (location.state as { message?: string })?.message;

  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(redirectMessage ?? null);
  const [shakeKey,   setShakeKey]   = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotId,   setForgotId]   = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password, rememberMe);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falsche Zugangsdaten';
      setError(msg === 'Session expired' ? 'Sitzung abgelaufen.' : 'Falsche Zugangsdaten. Bitte erneut versuchen.');
      setShakeKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    setForgotBusy(true);
    setError(null);
    try {
      await authApi.forgotPassword(forgotId.trim());
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #2c1a0a 0%, #180e04 50%, #0e0804 100%)' }}
    >
      {/* Grain texture */}
      <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: grain }} />

      {/* Ambient gold orb */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(200,146,42,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* Card */}
      <motion.div
        key={shakeKey}
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1, x: error && shakeKey > 0 ? [0, -10, 10, -8, 8, -4, 4, 0] : 0 }}
        transition={shakeKey > 0 && error ? { duration: 0.45 } : springs.gentle}
        className="relative w-full max-w-[400px] mx-4"
      >
        <div className="rounded-2xl border border-white/8 overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(44,26,10,0.92) 0%, rgba(24,14,4,0.96) 100%)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.52), inset 0 1px 0 rgba(242,228,200,0.06)',
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center px-8 pt-10 pb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...springs.bounce, delay: 0.1 }}
              className="w-20 h-20 rounded-full mb-5 overflow-hidden border-2 border-diwan-gold/30"
              style={{ boxShadow: '0 0 32px rgba(200,146,42,0.2)' }}
            >
              <img src="/uploads/diwan-logo-new.png" alt="Diwan" className="w-full h-full object-cover" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="text-center"
            >
              <p className="text-diwan-gold text-[10px] tracking-[0.22em] uppercase font-medium mb-2">
                Mitarbeiter-Zugang
              </p>
              <h1 className="font-display text-diwan-cream text-2xl font-normal tracking-wide">
                Diwan Berlin
              </h1>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="h-px mx-8" style={{ background: 'linear-gradient(to right, transparent, rgba(200,146,42,0.25), transparent)' }} />

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.26 }}
            className="px-8 py-8 space-y-5"
          >
            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl px-4 py-3 text-sm text-red-300 border border-red-500/20 bg-red-500/8"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-[0.15em] uppercase text-diwan-dim font-medium">
                Benutzername
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm text-diwan-cream placeholder-diwan-dim/50',
                  'bg-black/25 border border-white/10',
                  'focus:outline-none focus:border-diwan-gold/50 focus:ring-2 focus:ring-diwan-gold/12',
                  'transition-all duration-200',
                )}
                placeholder="Benutzername eingeben"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-[0.15em] uppercase text-diwan-dim font-medium">
                Passwort
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={cn(
                    'w-full rounded-xl px-4 py-3 pr-11 text-sm text-diwan-cream placeholder-diwan-dim/50',
                    'bg-black/25 border border-white/10',
                    'focus:outline-none focus:border-diwan-gold/50 focus:ring-2 focus:ring-diwan-gold/12',
                    'transition-all duration-200',
                  )}
                  placeholder="Passwort eingeben"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-diwan-dim hover:text-diwan-cream transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setRememberMe(v => !v)}
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 flex-shrink-0',
                    rememberMe
                      ? 'bg-diwan-gold border-diwan-gold'
                      : 'border-white/20 bg-transparent group-hover:border-diwan-gold/50',
                  )}
                >
                  {rememberMe && (
                    <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springs.snap}
                      viewBox="0 0 10 8" className="w-2.5 h-2" fill="none"
                    >
                      <path d="M1 4L3.5 6.5L9 1" stroke="#180e04" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </div>
                <span className="text-xs text-diwan-dim group-hover:text-diwan-cream transition-colors">
                  Angemeldet bleiben
                </span>
              </label>
              <button
                type="button"
                onClick={() => { setForgotOpen(v => !v); setForgotSent(false); setForgotId(username); }}
                className="text-xs text-diwan-gold hover:text-diwan-cream transition-colors"
              >
                Passwort vergessen?
              </button>
            </div>

            <AnimatePresence>
              {forgotOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-diwan-gold/15 bg-black/18 p-3">
                    {forgotSent ? (
                      <p className="text-xs leading-5 text-diwan-cream/80">
                        Wenn ein Konto mit E-Mail existiert, wurde ein Reset-Link versendet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-diwan-dim">Benutzername oder E-Mail eingeben.</p>
                        <div className="flex gap-2">
                          <input
                            value={forgotId}
                            onChange={e => setForgotId(e.target.value)}
                            className="min-w-0 flex-1 rounded-xl px-3 py-2 text-xs text-diwan-cream bg-black/25 border border-white/10 focus:outline-none focus:border-diwan-gold/50"
                            placeholder="admin@..."
                          />
                          <button
                            type="button"
                            onClick={handleForgot}
                            disabled={forgotBusy || !forgotId.trim()}
                            className="rounded-xl bg-diwan-gold px-3 py-2 text-xs font-bold text-diwan-bg disabled:opacity-50"
                          >
                            Senden
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || !username || !password}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5',
                'text-sm font-semibold tracking-wide transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'bg-diwan-gold text-diwan-bg hover:bg-diwan-gold2',
              )}
              style={{ boxShadow: loading ? 'none' : '0 4px 20px rgba(200,146,42,0.28)' }}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-diwan-bg/30 border-t-diwan-bg rounded-full"
                />
              ) : (
                <>
                  <LogIn size={15} />
                  Anmelden
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <div className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-black/15 px-3 py-2">
              <img src="/uploads/partners/gandom-ai-logo.png" alt="Gandom AI" className="h-6 w-6 rounded object-cover" />
              <p className="text-[10px] leading-tight text-diwan-dim/75">
                Portal developed by <span className="text-diwan-cream">Gandom AI</span>
              </p>
            </div>
            <p className="text-[11px] text-diwan-dim/50">Cafe Diwan Berlin · Restaurant Operations</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
