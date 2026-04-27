import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AdminLang = 'de' | 'fa';

const DICT = {
  de: {
    adminLabel: 'Restaurant Admin',
    service: 'Service',
    planning: 'Planung',
    management: 'Verwaltung',
    search: 'Suchen',
    searchPlaceholder: 'Suchen oder navigieren...',
    noResults: 'Keine Ergebnisse',
    live: 'Live',
    offline: 'Offline',
    logout: 'Abmelden',
    developedBy: 'Developed by',
    dashboard: 'Dashboard',
    dashboardMeta: 'Überblick & Kennzahlen',
    tables: 'Tische',
    tablesMeta: 'Belegung & Status',
    orders: 'Küchen-KDS',
    ordersMeta: 'Live Bestellungen',
    reservations: 'Reservierungen',
    reservationsMeta: 'Tische zuweisen',
    events: 'Event-Anfragen',
    eventsMeta: 'Anfragen bearbeiten',
    eventListings: 'Eventkalender',
    eventListingsMeta: 'Website Events',
    menu: 'Speisekarte',
    menuMeta: 'Kategorien & Artikel',
    customers: 'Kunden & Rabatte',
    customersMeta: 'Treue und Codes',
    hr: 'Team & Zeiten',
    hrMeta: 'Planung und Schichten',
    website: 'Website',
    websiteMeta: 'Texte ohne Code',
    team: 'Teamkonten',
    teamMeta: 'Rollen und Zugriff',
    settings: 'Einstellungen',
    settingsMeta: 'Kapazitäten & mehr',
  },
  fa: {
    adminLabel: 'مدیریت رستوران',
    service: 'سرویس',
    planning: 'برنامه ریزی',
    management: 'مدیریت',
    search: 'جستجو',
    searchPlaceholder: 'جستجو یا رفتن به بخش...',
    noResults: 'نتیجه ای پیدا نشد',
    live: 'زنده',
    offline: 'آفلاین',
    logout: 'خروج',
    developedBy: 'توسعه توسط',
    dashboard: 'داشبورد',
    dashboardMeta: 'نمای کلی و آمار',
    tables: 'میزها',
    tablesMeta: 'اشغال و وضعیت',
    orders: 'آشپزخانه',
    ordersMeta: 'سفارش های زنده',
    reservations: 'رزروها',
    reservationsMeta: 'اختصاص میز',
    events: 'درخواست های رویداد',
    eventsMeta: 'بررسی درخواست ها',
    eventListings: 'تقویم رویدادها',
    eventListingsMeta: 'رویدادهای وب سایت',
    menu: 'منو',
    menuMeta: 'دسته ها و آیتم ها',
    customers: 'مشتریان و تخفیف ها',
    customersMeta: 'وفاداری و کدها',
    hr: 'تیم و زمان ها',
    hrMeta: 'برنامه و شیفت ها',
    website: 'وب سایت',
    websiteMeta: 'متن ها بدون کدنویسی',
    team: 'حساب های تیم',
    teamMeta: 'نقش ها و دسترسی',
    settings: 'تنظیمات',
    settingsMeta: 'ظرفیت ها و بیشتر',
  },
} as const;

type AdminI18nContext = {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
  t: (key: AdminI18nKey) => string;
};

export type AdminI18nKey = keyof typeof DICT.de;

const Context = createContext<AdminI18nContext | null>(null);

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(() => {
    return localStorage.getItem('diwanAdminLang') === 'fa' ? 'fa' : 'de';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  }, [lang]);

  const value = useMemo<AdminI18nContext>(() => ({
    lang,
    setLang: (next) => {
      setLangState(next);
      localStorage.setItem('diwanAdminLang', next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'fa' ? 'rtl' : 'ltr';
    },
    t: (key) => DICT[lang][key] || DICT.de[key],
  }), [lang]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminI18n() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useAdminI18n must be used within AdminI18nProvider');
  return ctx;
}
