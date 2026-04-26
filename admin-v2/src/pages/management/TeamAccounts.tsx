import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCog, Plus, RefreshCw, Copy, Check,
  ShieldOff, Shield, ChevronRight, Trash2,
} from 'lucide-react';
import { teamApi } from '@/lib/api';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { cn, springs, getInitials, ROLE_LABELS } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { TeamMember, Role } from '@/types';

const ROLES: Role[] = ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'];

const ROLE_COLORS: Record<Role, string> = {
  OWNER:   'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  WAITER:  'bg-amber-100 text-amber-700',
  KITCHEN: 'bg-red-100 text-red-600',
};

function generatePassword(len = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-diwan-gold/10 text-diwan-gold text-xs font-semibold hover:bg-diwan-gold/20 transition-colors"
    >
      {copied ? <><Check size={12} /> Kopiert</> : <><Copy size={12} /> Kopieren</>}
    </button>
  );
}

export function TeamAccounts() {
  const qc = useQueryClient();
  const { user: me } = useAuth();

  const [sheet,      setSheet]      = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [tempPw,     setTempPw]     = useState('');
  const [resetResult, setResetResult] = useState<{ id: string; pw: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  const [form, setForm] = useState({
    username:    '',
    email:       '',
    displayName: '',
    role:        'WAITER' as Role,
    password:    generatePassword(),
  });

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn:  teamApi.list,
  });

  const createMember = useMutation({
    mutationFn: () => teamApi.create({ ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); closeSheet(); },
  });

  const updateMember = useMutation({
    mutationFn: () => teamApi.update(editMember!.id, { displayName: form.displayName, email: form.email, role: form.role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); closeSheet(); },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => teamApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });

  const resetPassword = useMutation({
    mutationFn: (id: string) => teamApi.resetPassword(id),
    onSuccess: (res, id) => { setResetResult({ id, pw: res.tempPassword }); qc.invalidateQueries({ queryKey: ['team'] }); },
  });

  const deleteMember = useMutation({
    mutationFn: (id: string) => teamApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      setDeleteTarget(null);
    },
  });

  function openNew() {
    setEditMember(null);
    setForm({ username: '', email: '', displayName: '', role: 'WAITER', password: generatePassword() });
    setTempPw('');
    setSheet(true);
  }

  function openEdit(m: TeamMember) {
    setEditMember(m);
    setForm({ username: m.username, email: m.email ?? '', displayName: m.displayName ?? '', role: m.role, password: '' });
    setTempPw('');
    setSheet(true);
  }

  function closeSheet() {
    setSheet(false);
    setEditMember(null);
    setResetResult(null);
  }

  const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm text-ink bg-paper border border-diwan-gold/15 focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 transition-all';
  const labelCls = 'block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium mb-1.5';

  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<Role, number> = { OWNER: 0, MANAGER: 1, WAITER: 2, KITCHEN: 3 };
    return order[a.role] - order[b.role];
  });

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">Verwaltung</p>
          <h2 className="font-display text-ink text-2xl font-normal">Teamkonten</h2>
        </div>
        {me?.role === 'OWNER' && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 transition-colors"
          >
            <Plus size={15} /> Konto erstellen
          </button>
        )}
      </motion.div>

      {/* Reset password confirmation */}
      <AnimatePresence>
        {resetResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4"
          >
            <p className="text-xs font-bold text-green-700 mb-2">Temporäres Passwort erstellt</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-sm font-mono bg-white border border-green-200 rounded-lg px-3 py-1.5 text-ink">
                {resetResult.pw}
              </code>
              <CopyButton text={resetResult.pw} />
            </div>
            <p className="text-[10px] text-green-600 mt-2">Teilen Sie dieses Passwort sicher. Es wird beim nächsten Login zur Änderung aufgefordert.</p>
            <button onClick={() => setResetResult(null)} className="mt-2 text-[11px] text-green-700 hover:underline">Schließen</button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-paper2 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sortedMembers.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ ...springs.gentle, delay: i * 0.04 }}
                className={cn('flex items-center gap-4 bg-white border rounded-2xl px-4 py-3.5 transition-all', m.isActive ? 'border-diwan-gold/8' : 'border-paper2 opacity-60')}
              >
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0', m.isActive ? 'bg-diwan-gold/15 text-diwan-gold' : 'bg-paper2 text-ink2')}>
                  {getInitials(m.displayName ?? m.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink truncate">{m.displayName ?? m.username}</p>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', ROLE_COLORS[m.role])}>
                      {ROLE_LABELS[m.role]}
                    </span>
                    {!m.isActive && <span className="text-[10px] font-bold bg-paper2 text-ink2 px-1.5 py-0.5 rounded-full">Deaktiviert</span>}
                    {m.mustChangePassword && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Passwort ändern</span>}
                  </div>
                  <p className="text-[11px] text-ink2 mt-0.5">{m.username}{m.email ? ` · ${m.email}` : ''}</p>
                </div>

                {me?.role === 'OWNER' && m.id !== me.id && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(m)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-paper2 transition-colors text-ink2"
                      title="Bearbeiten"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => resetPassword.mutate(m.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-amber-50 hover:text-amber-600 transition-colors text-ink2"
                      title="Passwort zurücksetzen"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => deactivate.mutate(m.id)}
                      className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-colors', m.isActive ? 'hover:bg-red-50 hover:text-red-500 text-ink2' : 'hover:bg-green-50 hover:text-green-600 text-ink2')}
                      title={m.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {m.isActive ? <ShieldOff size={13} /> : <Shield size={13} />}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors text-ink2"
                      title="Konto löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit sheet */}
      <BottomSheet isOpen={sheet} onClose={closeSheet} title={editMember ? 'Konto bearbeiten' : 'Neues Konto'}>
        <div className="px-5 pb-8 space-y-4">
          {!editMember && (
            <div>
              <label className={labelCls}>Benutzername</label>
              <input
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                className={inputCls}
                placeholder="max.mustermann"
                autoCapitalize="none"
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Anzeigename</label>
            <input
              value={form.displayName}
              onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
              className={inputCls}
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label className={labelCls}>E-Mail für Passwort-Reset</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className={inputCls}
              placeholder="name@diwanberlin.com"
            />
          </div>

          <div>
            <label className={labelCls}>Rolle</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))} className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>

          {!editMember && (
            <div>
              <label className={labelCls}>Temporäres Passwort</label>
              <div className="flex gap-2">
                <input
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className={cn(inputCls, 'flex-1 font-mono tracking-wide')}
                />
                <button
                  onClick={() => setForm(p => ({ ...p, password: generatePassword() }))}
                  className="px-3 rounded-xl bg-paper2 text-ink2 hover:bg-paper text-xs font-semibold transition-colors flex-shrink-0"
                >
                  Neu
                </button>
              </div>
              <p className="text-[10px] text-ink2/60 mt-1.5">Der Mitarbeiter wird beim ersten Login aufgefordert, es zu ändern.</p>
            </div>
          )}

          {!editMember && form.username && form.password && (
            <div className="rounded-xl bg-diwan-gold/8 border border-diwan-gold/20 p-3">
              <p className="text-[10px] font-bold text-diwan-gold uppercase tracking-wide mb-2">Zugangsdaten kopieren</p>
              <CopyButton text={`Benutzername: ${form.username}\nPasswort: ${form.password}`} />
            </div>
          )}

          <button
            onClick={() => editMember ? updateMember.mutate() : createMember.mutate()}
            disabled={(editMember ? updateMember : createMember).isPending || (!editMember && (!form.username || !form.password))}
            className="w-full py-3 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 disabled:opacity-50 transition-colors"
          >
            {(editMember ? updateMember : createMember).isPending ? 'Wird gespeichert…' : editMember ? 'Speichern' : 'Konto erstellen'}
          </button>
        </div>
      </BottomSheet>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Teamkonto löschen?"
        description={deleteTarget ? `${deleteTarget.displayName ?? deleteTarget.username} wird dauerhaft entfernt. Für ehemalige Mitarbeiter ist Deaktivieren meistens besser als Löschen.` : ''}
        loading={deleteMember.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMember.mutate(deleteTarget.id)}
      />
    </div>
  );
}
