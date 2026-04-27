import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Pencil, Trash2, ChevronRight,
  ToggleLeft, ToggleRight, FolderTree, Database, AlertCircle, RefreshCw,
} from 'lucide-react';
import { menuApi } from '@/lib/api';
import { BottomSheet } from '@/components/primitives/BottomSheet';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { cn, springs, formatEur } from '@/lib/utils';
import type { MenuCategory, MenuItem } from '@/types';

const ITEM_EMPTY = { 
  nameDe: '', nameFa: '', nameEn: '', 
  descriptionDe: '', descriptionFa: '', descriptionEn: '', 
  price: 0, isAvailable: true, sortOrder: 0, imageUrl: '', categoryId: '',
  variantsText: '',
};
type ItemDraft = typeof ITEM_EMPTY;

function variantsToText(item?: MenuItem | null) {
  return (item?.variants ?? [])
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(v => [v.labelDe, Number(v.price).toFixed(2), v.labelFa || ''].join('|'))
    .join('\n');
}

function parseVariants(text: string) {
  return text
    .split('\n')
    .map((line, index) => {
      const [labelDe, price, labelFa] = line.split('|').map(part => part?.trim() ?? '');
      if (!labelDe || !price) return null;
      const value = Number(price.replace(',', '.'));
      if (!Number.isFinite(value) || value < 0) return null;
      return {
        labelDe,
        labelFa: labelFa || labelDe,
        labelEn: labelDe,
        price: value,
        sortOrder: index + 1,
        isDefault: index === 0,
        isActive: true,
      };
    })
    .filter(Boolean);
}

function ItemForm({ value, onChange }: { value: ItemDraft; onChange: (v: ItemDraft) => void }) {
  const set = (k: keyof ItemDraft, v: unknown) => onChange({ ...value, [k]: v });
  const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm text-ink bg-paper border border-diwan-gold/15 focus:outline-none focus:ring-2 focus:ring-diwan-gold/20 focus:border-diwan-gold/40 transition-all';
  const labelCls = 'block text-[10px] tracking-[0.14em] uppercase text-ink2 font-medium mb-1.5';
  return (
    <div className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Name (DE)</label>
          <input value={value.nameDe} onChange={e => set('nameDe', e.target.value)} className={inputCls} placeholder="Name auf Deutsch" />
        </div>
        <div>
          <label className={labelCls}>Name (FA)</label>
          <input value={value.nameFa} onChange={e => set('nameFa', e.target.value)} className={inputCls} placeholder="نام" dir="rtl" />
        </div>
      </div>
      
      {/* Description fields */}
      <div>
        <label className={labelCls}>Beschreibung (DE)</label>
        <textarea value={value.descriptionDe} onChange={e => set('descriptionDe', e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} placeholder="Kurze Beschreibung…" />
      </div>
      <div>
        <label className={labelCls}>Beschreibung (FA)</label>
        <textarea value={value.descriptionFa} onChange={e => set('descriptionFa', e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} placeholder="توضیحات" dir="rtl" />
      </div>
      
      {/* Image upload */}
      <div>
        <label className={labelCls}>Bild URL</label>
        <div className="flex gap-2">
          <input 
            value={value.imageUrl || ''} 
            onChange={e => set('imageUrl', e.target.value)} 
            className={inputCls} 
            placeholder="https://..." 
          />
          {value.imageUrl && (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-paper2 flex-shrink-0">
              <img src={value.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
      
      {/* Price and sort */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Preis (€)</label>
          <input type="number" min={0} step={0.01} value={value.price || ''} onChange={e => set('price', Number(e.target.value))} className={inputCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Reihenfolge</label>
          <input type="number" min={0} value={value.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Größen & Preise</label>
        <textarea
          value={value.variantsText}
          onChange={e => set('variantsText', e.target.value)}
          rows={4}
          className={cn(inputCls, 'resize-none font-mono text-xs leading-5')}
          placeholder={'Klein|3.50|کوچک\nMittel|4.20|متوسط\nGroß|4.90|بزرگ'}
        />
        <p className="mt-1 text-[10px] text-ink2/70">
          Optional. Eine Variante pro Zeile: Deutsch|Preis|Persisch. Wenn Varianten vorhanden sind, werden diese Preise beim QR- und Service-Bestellen verwendet.
        </p>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => set('isAvailable', !value.isAvailable)}
          className={cn('w-10 h-5 rounded-full relative transition-colors flex-shrink-0', value.isAvailable ? 'bg-green-500' : 'bg-paper2 border border-diwan-gold/20')}
        >
          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform', value.isAvailable ? 'translate-x-5' : 'translate-x-0.5')} />
        </div>
        <span className="text-sm text-ink">{value.isAvailable ? 'Verfügbar' : 'Nicht verfügbar'}</span>
      </label>
    </div>
  );
}

export function Menu() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [activeCatId, setActiveCatId] = useState<string>('');
  const [itemSheet,   setItemSheet]   = useState(false);
  const [editItem,    setEditItem]    = useState<MenuItem | null>(null);
  const [itemForm,    setItemForm]    = useState<ItemDraft>(ITEM_EMPTY);
  const [newCatName,  setNewCatName]  = useState('');
  const [newCatNameFa, setNewCatNameFa] = useState('');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [addingCat,   setAddingCat]   = useState(false);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<MenuCategory | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: categories = [], isLoading, isError, error, refetch } = useQuery<MenuCategory[]>({
    queryKey: ['menu-categories'],
    queryFn:  menuApi.categories,
  });

  const parentCategories = categories.filter(c => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const navigationCategories = parentCategories.length > 0
    ? parentCategories
    : [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeCat = categories.find(c => c.id === activeCatId) ?? navigationCategories[0] ?? categories[0];
  const childrenByParent = categories.reduce<Record<string, MenuCategory[]>>((acc, cat) => {
    if (!cat.parentId) return acc;
    acc[cat.parentId] = [...(acc[cat.parentId] ?? []), cat].sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {});

  const saveItem = useMutation({
    mutationFn: async () => {
      const { variantsText, ...cleanForm } = itemForm;
      const payload = { ...cleanForm, categoryId: activeCat?.id ?? '', variants: parseVariants(variantsText) };
      const saved = editItem
        ? menuApi.updateItem(editItem.id, payload)
        : menuApi.createItem(payload);
      const item = await saved;
      if (imageFile) {
        setImageUploading(true);
        try {
          await menuApi.uploadItemImage(item.id, imageFile);
        } finally {
          setImageUploading(false);
        }
      }
      return item;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-categories'] });
      setItemSheet(false);
      setEditItem(null);
      setImageFile(null);
    },
    onError: () => setImageUploading(false),
  });

  const seedDefaults = useMutation({
    mutationFn: menuApi.seedDefaults,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['menu-categories'] });
    },
  });

  const toggleAvail = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => menuApi.toggleItem(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-categories'] }),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => menuApi.deleteItem(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['menu-categories'] });
      setDeletingItem(null);
      showToast('success', result.archived ? 'Artikel wurde aus der aktiven Speisekarte entfernt.' : 'Artikel wurde gelöscht.');
    },
    onError: (error) => {
      showToast('error', (error as Error)?.message || 'Artikel konnte nicht entfernt werden.');
    },
  });

  const addCategory = useMutation({
    mutationFn: () => menuApi.createCategory({
      nameDe: newCatName,
      nameFa: newCatNameFa,
      nameEn: newCatName,
      slug: newCatName.toLowerCase().trim().replace(/\s+/g, '-'),
      sortOrder: categories.length,
      isActive: true,
      parentId: newCatParentId || null,
    }),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['menu-categories'] });
      setActiveCatId(cat.id);
      setNewCatName('');
      setNewCatNameFa('');
      setNewCatParentId('');
      setAddingCat(false);
    },
  });

  const removeCategory = useMutation({
    mutationFn: (id: string) => menuApi.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu-categories'] }); setActiveCatId(''); setDeletingCategory(null); },
  });

  async function uploadImage(file: File) {
    if (!editItem) return;
    setImageUploading(true);
    try {
      const item = await menuApi.uploadItemImage(editItem.id, file);
      setItemForm(prev => ({ ...prev, imageUrl: item.imageUrl ?? '' }));
      await qc.invalidateQueries({ queryKey: ['menu-categories'] });
    } finally {
      setImageUploading(false);
    }
  }

  function openNewItem() {
    setEditItem(null);
    setImageFile(null);
    setItemForm({ ...ITEM_EMPTY, categoryId: activeCat?.id ?? '' });
    setItemSheet(true);
  }

  function openEditItem(item: MenuItem) {
    setEditItem(item);
    setImageFile(null);
    setItemForm({ 
      ...ITEM_EMPTY,
      ...item, 
      nameEn: item.nameEn ?? '',
      descriptionFa: item.descriptionFa ?? '',
      descriptionEn: item.descriptionEn ?? '',
      imageUrl: item.imageUrl ?? '',
      variantsText: variantsToText(item),
    });
    setItemSheet(true);
  }

  if (isLoading) {
    return (
      <div className="p-6 flex gap-6">
        <div className="w-48 space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-10 rounded-xl bg-paper2 animate-pulse" />)}</div>
        <div className="flex-1 space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-paper2 animate-pulse" />)}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="mt-1 text-red-500" size={24} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-500 mb-1">Speisekarte konnte nicht geladen werden</p>
              <h2 className="font-display text-2xl text-ink mb-2">API-Verbindung prüfen</h2>
              <p className="text-sm text-ink2">
                {(error as Error)?.message ?? 'Die Kategorien und Artikel konnten nicht vom Backend geladen werden.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-2 rounded-xl bg-diwan-gold px-4 py-2 text-sm font-bold text-diwan-bg"
                >
                  <RefreshCw size={14} /> Erneut laden
                </button>
                <button
                  onClick={() => seedDefaults.mutate()}
                  disabled={seedDefaults.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-diwan-gold/25 px-4 py-2 text-sm font-bold text-ink disabled:opacity-50"
                >
                  <Database size={14} /> {seedDefaults.isPending ? 'Wird eingefügt…' : 'Startkarte einfügen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-diwan-gold font-medium mb-1">Verwaltung</p>
          <h2 className="font-display text-ink text-2xl font-normal">Speisekarte</h2>
        </div>
        <button
          onClick={() => seedDefaults.mutate()}
          disabled={seedDefaults.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-diwan-gold/20 bg-white px-3 py-2 text-xs font-bold text-ink shadow-sm hover:border-diwan-gold/40 hover:text-diwan-gold disabled:opacity-50"
        >
          <Database size={14} />
          {seedDefaults.isPending ? 'Startkarte wird eingefügt…' : 'Startkarte einfügen'}
        </button>
      </motion.div>

      {categories.length === 0 ? (
        <div className="rounded-3xl border border-diwan-gold/12 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-diwan-gold/10 text-diwan-gold">
            <BookOpen size={28} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-diwan-gold mb-2">Noch keine Speisekarte</p>
          <h3 className="font-display text-2xl text-ink">Startkarte mit Kategorien und Artikeln einfügen</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink2">
            Dadurch werden Getränke, Kaffee, Tee, Softdrinks, saisonale Säfte, alkoholische Getränke,
            Snacks und afghanische Snacks mit editierbaren Beispielartikeln angelegt.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => seedDefaults.mutate()}
              disabled={seedDefaults.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-diwan-gold px-5 py-3 text-sm font-bold text-diwan-bg hover:bg-diwan-gold2 disabled:opacity-50"
            >
              <Database size={16} />
              {seedDefaults.isPending ? 'Wird eingefügt…' : 'Startkarte einfügen'}
            </button>
            <button
              onClick={() => setAddingCat(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-diwan-gold/20 px-5 py-3 text-sm font-bold text-ink hover:border-diwan-gold/40"
            >
              <Plus size={16} /> Leere Kategorie erstellen
            </button>
          </div>
          {addingCat && (
            <div className="mx-auto mt-5 grid max-w-2xl gap-2 rounded-2xl border border-diwan-gold/12 bg-paper p-4 text-left sm:grid-cols-2">
              <input
                autoFocus
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Kategorie DE"
                className="rounded-xl border border-diwan-gold/20 bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-diwan-gold/20"
              />
              <input
                value={newCatNameFa}
                onChange={e => setNewCatNameFa(e.target.value)}
                placeholder="نام فارسی"
                dir="rtl"
                className="rounded-xl border border-diwan-gold/20 bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-diwan-gold/20"
              />
              <button
                onClick={() => newCatName && addCategory.mutate()}
                disabled={!newCatName || addCategory.isPending}
                className="sm:col-span-2 rounded-xl bg-diwan-gold px-4 py-2 text-sm font-bold text-diwan-bg disabled:opacity-50"
              >
                {addCategory.isPending ? 'Wird erstellt…' : 'Kategorie speichern'}
              </button>
            </div>
          )}
        </div>
      ) : (
      <div className="flex gap-6">
        {/* Category sidebar */}
        <div className="w-48 flex-shrink-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink2/60 px-2 mb-2">Kategorien</p>
          {navigationCategories.map(parent => {
            const children = childrenByParent[parent.id] ?? [];
            const parentActive = activeCat?.id === parent.id;
            return (
              <div key={parent.id} className="space-y-1">
                <button
                  onClick={() => setActiveCatId(parent.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm transition-all',
                    parentActive
                      ? 'bg-diwan-gold/12 text-ink font-semibold border border-diwan-gold/20'
                      : 'text-ink2 hover:bg-paper2 hover:text-ink',
                  )}
                >
                  <ChevronRight size={12} className={cn('flex-shrink-0 transition-transform', (parentActive || children.some(c => c.id === activeCat?.id)) && 'rotate-90 text-diwan-gold')} />
                  <span className="truncate flex-1">{parent.nameDe}</span>
                  <span className="text-[10px] text-ink2/50 flex-shrink-0">{parent.items?.length ?? 0}</span>
                </button>
                {children.length > 0 && (
                  <div className="ml-4 space-y-1 border-l border-diwan-gold/12 pl-2">
                    {children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => setActiveCatId(child.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all',
                          activeCat?.id === child.id
                            ? 'bg-diwan-gold/10 text-ink font-semibold'
                            : 'text-ink2 hover:bg-paper2 hover:text-ink',
                        )}
                      >
                        <FolderTree size={11} className="text-diwan-gold/70 flex-shrink-0" />
                        <span className="truncate flex-1">{child.nameDe}</span>
                        <span className="text-[10px] text-ink2/50 flex-shrink-0">{child.items?.length ?? 0}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add category */}
          {addingCat ? (
            <div className="space-y-1.5 pt-1">
              <input
                autoFocus
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newCatName) addCategory.mutate(); if (e.key === 'Escape') setAddingCat(false); }}
                placeholder="Name…"
                className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-diwan-gold/30 text-ink outline-none focus:ring-2 focus:ring-diwan-gold/20"
              />
              <input
                value={newCatNameFa}
                onChange={e => setNewCatNameFa(e.target.value)}
                placeholder="نام فارسی…"
                dir="rtl"
                className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-diwan-gold/20 text-ink outline-none focus:ring-2 focus:ring-diwan-gold/20"
              />
              <select
                value={newCatParentId}
                onChange={e => setNewCatParentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-diwan-gold/20 text-ink2 outline-none"
              >
                <option value="">Hauptkategorie</option>
                {parentCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>Unterkategorie von {cat.nameDe}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <button onClick={() => newCatName && addCategory.mutate()} className="flex-1 py-1 text-[11px] font-semibold rounded-lg bg-diwan-gold text-diwan-bg">OK</button>
                <button onClick={() => setAddingCat(false)} className="flex-1 py-1 text-[11px] text-ink2 rounded-lg bg-paper2">Abbrechen</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCat(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-ink2 hover:text-diwan-gold hover:bg-diwan-gold/5 transition-all border border-dashed border-diwan-gold/20"
            >
              <Plus size={13} /> Kategorie
            </button>
          )}
        </div>

        {/* Items panel */}
        <div className="flex-1 min-w-0">
          {!activeCat ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen size={32} className="text-diwan-gold/30 mb-3" />
              <p className="text-ink2 text-sm">Wählen Sie eine Kategorie</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-ink">{activeCat.nameDe}</h3>
                  <span className="text-xs text-ink2">{activeCat.items?.length ?? 0} Artikel</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openNewItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-diwan-gold text-diwan-bg text-xs font-semibold hover:bg-diwan-gold2 transition-colors"
                  >
                    <Plus size={12} /> Artikel
                  </button>
                  <button
                    onClick={() => setDeletingCategory(activeCat)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-red-50 text-ink2 hover:text-red-500 transition-colors"
                    title="Kategorie löschen"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {(!activeCat.items || activeCat.items.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-diwan-gold/15 rounded-2xl">
                  <p className="text-sm text-ink2 mb-3">Noch keine Artikel</p>
                  <button onClick={openNewItem} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-diwan-gold/10 text-diwan-gold text-sm font-semibold hover:bg-diwan-gold/20 transition-colors">
                    <Plus size={14} /> Ersten Artikel hinzufügen
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {activeCat.items.sort((a, b) => a.sortOrder - b.sortOrder).map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ ...springs.gentle, delay: i * 0.02 }}
                        className="flex items-center gap-3 bg-white rounded-2xl border border-diwan-gold/8 px-4 py-3 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn('text-sm font-semibold', item.isAvailable ? 'text-ink' : 'text-ink2/50 line-through')}>
                              {item.nameDe}
                            </p>
                            {!item.isAvailable && (
                              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Nicht verfügbar</span>
                            )}
                          </div>
                          {item.descriptionDe && (
                            <p className="text-[11px] text-ink2 truncate mt-0.5">{item.descriptionDe}</p>
                          )}
                          {item.variants && item.variants.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.variants
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map(variant => (
                                  <span key={variant.id} className="rounded-full bg-diwan-gold/10 px-2 py-0.5 text-[10px] font-semibold text-diwan-gold">
                                    {variant.labelDe} · {formatEur(variant.price)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-bold text-diwan-gold flex-shrink-0">
                          {item.variants?.length ? `${item.variants.length} Größen` : formatEur(item.price)}
                        </p>

                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleAvail.mutate({ id: item.id, val: !item.isAvailable })}
                            title={item.isAvailable ? 'Deaktivieren' : 'Aktivieren'}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-paper2 transition-colors text-ink2"
                          >
                            {item.isAvailable ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} />}
                          </button>
                          <button
                            onClick={() => openEditItem(item)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-paper2 transition-colors text-ink2"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingItem(item)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors text-ink2"
                            title="Artikel löschen"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Item edit/create sheet */}
      <BottomSheet
        isOpen={itemSheet}
        onClose={() => { setItemSheet(false); setEditItem(null); setImageFile(null); }}
        title={editItem ? 'Artikel bearbeiten' : 'Neuer Artikel'}
      >
        <div className="px-5 pb-8 space-y-5">
          <ItemForm value={itemForm} onChange={setItemForm} />
          <label className="block rounded-xl border border-diwan-gold/15 bg-paper p-3">
            <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-ink2 mb-2">
              Bild hochladen
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={imageUploading || saveItem.isPending}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                if (editItem) {
                  uploadImage(file);
                } else {
                  setImageFile(file);
                }
              }}
              className="block w-full text-xs text-ink2 file:mr-3 file:rounded-lg file:border-0 file:bg-diwan-gold file:px-3 file:py-2 file:text-xs file:font-bold file:text-diwan-bg"
            />
            <p className="mt-2 text-[10px] text-ink2/60">
              {imageUploading
                ? 'Bild wird optimiert…'
                : imageFile
                  ? `${imageFile.name} wird nach dem Speichern optimiert hochgeladen.`
                  : 'Bilder werden als WebP optimiert und im Upload-Ordner gespeichert.'}
            </p>
          </label>
          <button
            onClick={() => saveItem.mutate()}
            disabled={saveItem.isPending || !itemForm.nameDe || itemForm.price <= 0}
            className="w-full py-3 rounded-xl bg-diwan-gold text-diwan-bg text-sm font-semibold hover:bg-diwan-gold2 disabled:opacity-50 transition-colors"
          >
            {saveItem.isPending ? 'Wird gespeichert…' : editItem ? 'Änderungen speichern' : 'Artikel hinzufügen'}
          </button>
        </div>
      </BottomSheet>
      <ConfirmDialog
        open={Boolean(deletingItem)}
        title="Artikel löschen?"
        description={deletingItem ? `${deletingItem.nameDe} wird aus der aktiven Speisekarte entfernt. Historische Bestellungen bleiben erhalten.` : ''}
        loading={removeItem.isPending}
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => deletingItem && removeItem.mutate(deletingItem.id)}
      />
      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title="Kategorie löschen?"
        description={deletingCategory ? `${deletingCategory.nameDe} wird dauerhaft entfernt. Kategorien mit Unterkategorien oder Artikeln können vom Server abgelehnt werden.` : ''}
        loading={removeCategory.isPending}
        onCancel={() => setDeletingCategory(null)}
        onConfirm={() => deletingCategory && removeCategory.mutate(deletingCategory.id)}
      />
    </div>
  );
}
