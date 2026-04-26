import { Construction } from 'lucide-react';
export function Website() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-diwan-gold/10 flex items-center justify-center">
        <Construction size={28} className="text-diwan-gold" />
      </div>
      <div className="text-center">
        <h2 className="font-display text-ink text-xl mb-1">Team & Zeiten</h2>
        <p className="text-ink2 text-sm">Schichtplanung und Zeiterfassung</p>
        <p className="text-xs text-ink2/50 mt-2">Phase 3 — wird implementiert</p>
      </div>
    </div>
  );
}
