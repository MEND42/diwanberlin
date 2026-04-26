import { Construction } from 'lucide-react';
export function HR() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-diwan-gold/10 flex items-center justify-center">
        <Construction size={28} className="text-diwan-gold" />
      </div>
      <div className="text-center">
        <h2 className="font-display text-ink text-xl mb-1">Teamkonten</h2>
        <p className="text-ink2 text-sm">Rollen und Zugriffsrechte</p>
        <p className="text-xs text-ink2/50 mt-2">Phase 3 — wird implementiert</p>
      </div>
    </div>
  );
}
