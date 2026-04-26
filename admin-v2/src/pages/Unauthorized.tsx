import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAppStore, getDefaultShell } from '@/store/appStore';

export function Unauthorized() {
  const user = useAppStore(s => s.user);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
        <ShieldOff size={28} className="text-red-400" />
      </div>
      <div className="text-center">
        <h1 className="font-display text-ink text-2xl mb-2">Keine Berechtigung</h1>
        <p className="text-ink2 text-sm">Diese Seite ist für Ihre Rolle nicht zugänglich.</p>
      </div>
      <button
        onClick={() => navigate(user ? `/${getDefaultShell(user.role)}` : '/login')}
        className="rounded-xl bg-diwan-gold text-diwan-bg px-6 py-2.5 text-sm font-semibold hover:bg-diwan-gold2 transition-colors"
      >
        Zurück zum Dashboard
      </button>
    </div>
  );
}
