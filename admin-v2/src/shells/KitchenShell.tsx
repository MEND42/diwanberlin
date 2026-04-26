import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, LogOut, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { useAuth }   from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useKdsSound } from '@/hooks/useKdsSound';
import { cn }        from '@/lib/utils';

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-kds-text/70 text-sm tabular-nums">
      {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export function KitchenShell() {
  const { logout }   = useAuth();
  const { status }   = useSocket();
  const sound         = useKdsSound();
  const navigate     = useNavigate();

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-kds-bg">
      {/* Slim header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-kds-border">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md overflow-hidden opacity-70">
            <img src="/uploads/diwan-logo-new.png" alt="" className="w-full h-full object-cover" />
          </div>
          <span className="text-kds-text/70 text-sm font-medium tracking-wide">Küche · Cafe Diwan</span>
        </div>

        <LiveClock />

        <div className="flex items-center gap-3">
          {/* Connection */}
          <div className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border',
            status === 'connected'
              ? 'text-green-400 border-green-500/30 bg-green-500/8'
              : 'text-red-400 border-red-500/30 bg-red-500/8',
          )}>
            {status === 'connected' ? <Wifi size={10} /> : <WifiOff size={10} />}
            {status === 'connected' ? 'Verbunden' : 'Getrennt'}
          </div>

          {/* Fullscreen */}
          <button
            onClick={sound.toggle}
            title={sound.enabled ? 'Ton ausschalten' : 'Ton einschalten'}
            aria-pressed={sound.enabled}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
              sound.enabled
                ? 'text-kds-text/80 bg-white/6 hover:bg-white/10'
                : 'text-kds-text/35 hover:text-kds-text/70 hover:bg-white/5',
            )}
          >
            {sound.enabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          <button
            onClick={toggleFullscreen}
            title="Vollbild"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-kds-text/40 hover:text-kds-text/70 hover:bg-white/5 transition-colors"
          >
            <Maximize2 size={13} />
          </button>

          {/* Switch to management */}
          <button
            onClick={() => navigate('/management/dashboard')}
            className="text-[11px] text-kds-text/40 hover:text-kds-text/70 transition-colors px-2 py-1"
          >
            Verwaltung
          </button>

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-kds-text/40 hover:text-red-400 hover:bg-red-500/8 transition-colors"
          >
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* KDS content — takes remaining height */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
