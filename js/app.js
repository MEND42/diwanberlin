const API_URL = (() => {
  if (window.DIWAN_API_URL) return window.DIWAN_API_URL;
  if (window.location.protocol === 'file:') return 'https://diwanberlin.com/api';
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) return 'http://localhost:3000/api';
  return '/api';
})();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function lang() {
  return typeof currentLang === 'string' ? currentLang : 'de';
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function eur(value) {
  return `€ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function localized(record, field, fallbackField) {
  const suffix = lang() === 'fa' ? 'Fa' : lang() === 'en' ? 'En' : 'De';
  return record?.[`${field}${suffix}`] || record?.[fallbackField] || record?.[`${field}De`] || '';
}

function variantPriceLine(item) {
  const variants = Array.isArray(item.variants)
    ? item.variants.filter(variant => variant.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : [];
  if (!variants.length) return `<div class="mp">${eur(item.price)}</div>`;
  return `
    <div class="mp mi-variants">
      ${variants.map(variant => `<span>${esc(localized(variant, 'label', 'labelDe'))} · ${eur(variant.price)}</span>`).join('')}
    </div>
  `;
}

const PUBLIC_MENU_FALLBACK = [
  {
    slug: 'drinks',
    nameDe: 'Getränke',
    nameFa: 'نوشیدنی‌ها',
    nameEn: 'Drinks',
    subcategories: [
      {
        slug: 'hot-drinks',
        nameDe: 'Heiße Getränke',
        nameFa: 'نوشیدنی‌های گرم',
        nameEn: 'Hot Drinks',
        items: [
          { nameDe: 'Heiße Schokolade', nameFa: 'شکلات داغ', nameEn: 'Hot Chocolate', descriptionDe: 'Dunkle Schokolade mit warmer Milch.', descriptionFa: 'شکلات تلخ با شیر گرم.', descriptionEn: 'Dark chocolate with warm milk.', price: 4.4, isAvailable: true },
          { nameDe: 'Chai Latte', nameFa: 'چای لاته', nameEn: 'Chai Latte', descriptionDe: 'Gewürztee mit Milch und feinem Schaum.', descriptionFa: 'چای ادویه‌دار با شیر و کف نرم.', descriptionEn: 'Spiced tea with milk and foam.', price: 4.6, isAvailable: true },
          { nameDe: 'Salep', nameFa: 'ثعلب', nameEn: 'Salep', descriptionDe: 'Warmer Milchdrink mit Zimt.', descriptionFa: 'نوشیدنی گرم شیری با دارچین.', descriptionEn: 'Warm milk drink with cinnamon.', price: 4.8, isAvailable: true },
        ],
      },
      {
        slug: 'coffees',
        nameDe: 'Kaffee',
        nameFa: 'قهوه',
        nameEn: 'Coffee',
        items: [
          { nameDe: 'Espresso', nameFa: 'اسپرسو', nameEn: 'Espresso', descriptionDe: 'Kräftiger Espresso mit dichter Crema.', descriptionFa: 'اسپرسوی قوی با کرمای لطیف.', descriptionEn: 'Strong espresso with rich crema.', price: 2.9, isAvailable: true },
          { nameDe: 'Cappuccino', nameFa: 'کاپوچینو', nameEn: 'Cappuccino', descriptionDe: 'Espresso mit samtigem Milchschaum.', descriptionFa: 'اسپرسو با کف شیر نرم.', descriptionEn: 'Espresso with silky milk foam.', price: 4.2, isAvailable: true },
          { nameDe: 'Kardamom Kaffee', nameFa: 'قهوه هل‌دار', nameEn: 'Cardamom Coffee', descriptionDe: 'Hauskaffee mit Kardamom.', descriptionFa: 'قهوه خانگی با هل.', descriptionEn: 'House coffee with cardamom.', price: 4.8, isAvailable: true, isSpecial: true },
        ],
      },
      {
        slug: 'teas',
        nameDe: 'Tee',
        nameFa: 'چای',
        nameEn: 'Tea',
        items: [
          { nameDe: 'Afghanischer Grüntee', nameFa: 'چای سبز افغانی', nameEn: 'Afghan Green Tea', descriptionDe: 'Grüntee mit Kardamom.', descriptionFa: 'چای سبز با هل.', descriptionEn: 'Green tea with cardamom.', price: 3.9, isAvailable: true },
          { nameDe: 'Kashmiri Chai', nameFa: 'چای کشمیری', nameEn: 'Kashmiri Chai', descriptionDe: 'Cremiger rosa Tee mit Milch.', descriptionFa: 'چای صورتی خامه‌ای با شیر.', descriptionEn: 'Creamy pink tea with milk.', price: 4.9, isAvailable: true },
          { nameDe: 'Frischer Minztee', nameFa: 'چای نعناع تازه', nameEn: 'Fresh Mint Tea', descriptionDe: 'Frische Minze, heiß aufgegossen.', descriptionFa: 'نعناع تازه دم‌شده.', descriptionEn: 'Fresh mint infusion.', price: 3.7, isAvailable: true },
        ],
      },
      {
        slug: 'cold-drinks',
        nameDe: 'Kalte Getränke',
        nameFa: 'نوشیدنی‌های سرد',
        nameEn: 'Cold Drinks',
        items: [
          { nameDe: 'Iced Latte', nameFa: 'آیس لاته', nameEn: 'Iced Latte', descriptionDe: 'Espresso auf Eis mit kalter Milch.', descriptionFa: 'اسپرسو با یخ و شیر سرد.', descriptionEn: 'Espresso over ice with cold milk.', price: 4.8, isAvailable: true },
          { nameDe: 'Hausgemachte Limonade', nameFa: 'لیموناد خانگی', nameEn: 'Homemade Lemonade', descriptionDe: 'Zitrone, Minze und leichte Süße.', descriptionFa: 'لیمو، نعناع و شیرینی ملایم.', descriptionEn: 'Lemon, mint and light sweetness.', price: 4.9, isAvailable: true },
        ],
      },
      {
        slug: 'soft-drinks',
        nameDe: 'Softdrinks',
        nameFa: 'نوشابه‌ها',
        nameEn: 'Soft Drinks',
        items: [
          { nameDe: 'Mineralwasser', nameFa: 'آب معدنی', nameEn: 'Mineral Water', descriptionDe: 'Still oder sprudelnd.', descriptionFa: 'ساده یا گازدار.', descriptionEn: 'Still or sparkling.', price: 2.8, isAvailable: true },
          { nameDe: 'Cola / Fanta / Sprite', nameFa: 'کولا / فانتا / اسپرایت', nameEn: 'Cola / Fanta / Sprite', descriptionDe: 'Klassisch gekühlt serviert.', descriptionFa: 'سرد سرو می‌شود.', descriptionEn: 'Served chilled.', price: 3.2, isAvailable: true },
          { nameDe: 'Ayran', nameFa: 'آیران', nameEn: 'Ayran', descriptionDe: 'Joghurtgetränk, leicht salzig.', descriptionFa: 'نوشیدنی ماستی کمی شور.', descriptionEn: 'Lightly salted yoghurt drink.', price: 3.4, isAvailable: true },
        ],
      },
      {
        slug: 'seasonal-juices',
        nameDe: 'Saisonale Säfte',
        nameFa: 'آبمیوه‌های فصلی',
        nameEn: 'Seasonal Juices',
        items: [
          { nameDe: 'Frischer Orangensaft', nameFa: 'آب پرتقال تازه', nameEn: 'Fresh Orange Juice', descriptionDe: 'Frisch gepresst.', descriptionFa: 'تازه فشرده‌شده.', descriptionEn: 'Freshly squeezed.', price: 5.2, isAvailable: true },
          { nameDe: 'Granatapfelsaft', nameFa: 'آب انار', nameEn: 'Pomegranate Juice', descriptionDe: 'Fruchtig und leicht herb.', descriptionFa: 'میوه‌ای و کمی ترش.', descriptionEn: 'Fruity and slightly tart.', price: 5.8, isAvailable: true },
          { nameDe: 'Mango Lassi', nameFa: 'منگو لسی', nameEn: 'Mango Lassi', descriptionDe: 'Mango, Joghurt und Kardamom.', descriptionFa: 'انبه، ماست و هل.', descriptionEn: 'Mango, yoghurt and cardamom.', price: 5.5, isAvailable: true },
        ],
      },
      {
        slug: 'alcoholic-drinks',
        nameDe: 'Alkoholische Getränke',
        nameFa: 'نوشیدنی‌های الکلی',
        nameEn: 'Alcoholic Drinks',
        items: [
          { nameDe: 'Hauswein Weiß', nameFa: 'شراب سفید خانه', nameEn: 'House White Wine', descriptionDe: 'Glas Hauswein, gekühlt serviert.', descriptionFa: 'یک گیلاس شراب سفید خانه.', descriptionEn: 'Glass of house white wine.', price: 5.8, isAvailable: true },
          { nameDe: 'Hauswein Rot', nameFa: 'شراب سرخ خانه', nameEn: 'House Red Wine', descriptionDe: 'Glas Hauswein, weich und rund.', descriptionFa: 'یک گیلاس شراب سرخ خانه.', descriptionEn: 'Glass of house red wine.', price: 5.8, isAvailable: true },
          { nameDe: 'Bier', nameFa: 'آبجو', nameEn: 'Beer', descriptionDe: 'Flaschenbier, gekühlt.', descriptionFa: 'آبجوی بطری سرد.', descriptionEn: 'Bottled beer, chilled.', price: 4.2, isAvailable: true },
        ],
      },
    ],
  },
  {
    slug: 'snacks',
    nameDe: 'Snacks',
    nameFa: 'میان‌وعده‌ها',
    nameEn: 'Snacks',
    subcategories: [
      {
        slug: 'light-snacks',
        nameDe: 'Leichte Snacks',
        nameFa: 'میان‌وعده‌های سبک',
        nameEn: 'Light Snacks',
        items: [
          { nameDe: 'Croissant', nameFa: 'کروسان', nameEn: 'Croissant', descriptionDe: 'Buttercroissant, frisch aufgebacken.', descriptionFa: 'کروسان کره‌ای تازه.', descriptionEn: 'Fresh butter croissant.', price: 2.9, isAvailable: true },
          { nameDe: 'Hummus Teller', nameFa: 'بشقاب حمص', nameEn: 'Hummus Plate', descriptionDe: 'Hummus, Öl, Gewürze und Brot.', descriptionFa: 'حمص با روغن، ادویه و نان.', descriptionEn: 'Hummus with oil, spices and bread.', price: 6.5, isAvailable: true },
        ],
      },
      {
        slug: 'afghan-snacks',
        nameDe: 'Afghanische Snacks',
        nameFa: 'میان‌وعده‌های افغانی',
        nameEn: 'Afghan Snacks',
        items: [
          { nameDe: 'Bolani Kartoffel', nameFa: 'بولانی کچالو', nameEn: 'Potato Bolani', descriptionDe: 'Gefülltes Fladenbrot mit Kartoffel und Kräutern.', descriptionFa: 'نان پرشده با کچالو و سبزی.', descriptionEn: 'Flatbread filled with potato and herbs.', price: 6.9, isAvailable: true, isSpecial: true },
          { nameDe: 'Sambosa', nameFa: 'سمبوسه', nameEn: 'Sambosa', descriptionDe: 'Knusprige Teigtaschen mit würziger Füllung.', descriptionFa: 'خمیر ترد با مواد مزه‌دار.', descriptionEn: 'Crispy pastries with spiced filling.', price: 5.9, isAvailable: true },
          { nameDe: 'Mantu Snack', nameFa: 'منتو کوچک', nameEn: 'Mantu Snack', descriptionDe: 'Gedämpfte Teigtaschen mit Joghurt und Sauce.', descriptionFa: 'منتوی بخارپز با ماست و سس.', descriptionEn: 'Steamed dumplings with yoghurt and sauce.', price: 8.5, isAvailable: true },
        ],
      },
      {
        slug: 'sweet-snacks',
        nameDe: 'Süße Snacks',
        nameFa: 'میان‌وعده‌های شیرین',
        nameEn: 'Sweet Snacks',
        items: [
          { nameDe: 'Baklava', nameFa: 'بقلوا', nameEn: 'Baklava', descriptionDe: 'Süßes Gebäck mit Nüssen.', descriptionFa: 'شیرینی با مغزها.', descriptionEn: 'Sweet pastry with nuts.', price: 4.8, isAvailable: true },
          { nameDe: 'Hauskuchen', nameFa: 'کیک خانگی', nameEn: 'House Cake', descriptionDe: 'Tageskuchen aus der Vitrine.', descriptionFa: 'کیک روز از ویترین.', descriptionEn: 'Cake of the day from the counter.', price: 4.6, isAvailable: true },
        ],
      },
    ],
  },
];

function flattenItems(category) {
  const direct = Array.isArray(category.items) ? category.items : [];
  const nested = Array.isArray(category.subcategories)
    ? category.subcategories.flatMap(sub => Array.isArray(sub.items) ? sub.items : [])
    : [];
  return [...direct, ...nested].filter(item => item.isAvailable !== false);
}

function menuGroups(category) {
  const groups = [];
  const direct = Array.isArray(category.items)
    ? category.items.filter(item => item.isAvailable !== false)
    : [];
  if (direct.length) {
    groups.push({
      slug: category.slug || category.id || 'category',
      nameDe: category.nameDe,
      nameFa: category.nameFa,
      nameEn: category.nameEn,
      items: direct,
    });
  }
  if (Array.isArray(category.subcategories)) {
    category.subcategories.forEach(subcategory => {
      const items = Array.isArray(subcategory.items)
        ? subcategory.items.filter(item => item.isAvailable !== false)
        : [];
      if (items.length) {
        groups.push({ ...subcategory, items });
      }
    });
  }
  return groups;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Public menu, rendered from admin-managed menu data.
async function renderMenu() {
  const menuSection = document.getElementById('menu');
  const tabsContainer = menuSection?.querySelector('.tabs');
  const inner = menuSection?.querySelector('.inner');
  if (!menuSection || !tabsContainer || !inner) return;

  let categories = [];
  let stale = false;
  try {
    categories = await fetchJson(`${API_URL}/menu/categories`);
    localStorage.setItem('diwanMenuCache', JSON.stringify(categories));
    localStorage.setItem('diwanMenuCacheTime', String(Date.now()));
  } catch (error) {
    const cache = localStorage.getItem('diwanMenuCache');
    const cacheTime = Number(localStorage.getItem('diwanMenuCacheTime') || 0);
    if (cache && Date.now() - cacheTime < 24 * 60 * 60 * 1000) {
      categories = JSON.parse(cache);
      stale = true;
    } else {
      categories = PUBLIC_MENU_FALLBACK;
      stale = true;
    }
  }

  let visibleCategories = categories
    .map(category => ({ ...category, _items: flattenItems(category) }))
    .filter(category => category._items.length > 0);

  inner.querySelectorAll('.panel.dynamic-panel,.menu-extra-controls').forEach(el => el.remove());

  if (!visibleCategories.length) {
    visibleCategories = PUBLIC_MENU_FALLBACK
      .map(category => ({ ...category, _items: flattenItems(category) }))
      .filter(category => category._items.length > 0);
    stale = true;
  }

  tabsContainer.innerHTML = visibleCategories.map((category, index) => {
    const label = localized(category, 'name', 'nameDe');
    return `<button class="tab ${index === 0 ? 'active' : ''}" data-tab="${esc(category.slug)}">${esc(label)}</button>`;
  }).join('');

  const controls = document.createElement('div');
  controls.className = 'menu-extra-controls';
  controls.innerHTML = `
    <div class="menu-tools">
      <div class="menu-search-wrap">
        <input type="search" id="menuSearch" placeholder="${lang() === 'fa' ? 'جستجو...' : lang() === 'en' ? 'Search...' : 'Suchen...'}" autocomplete="off">
      </div>
      <a href="${API_URL}/menu/pdf" target="_blank" class="btn-o"><span class="pl">↓</span> PDF</a>
      ${stale ? '<span class="menu-stale">Möglicherweise veraltet</span>' : ''}
    </div>
  `;
  tabsContainer.after(controls);

  visibleCategories.forEach((category, categoryIndex) => {
    const panel = document.createElement('div');
    const groups = menuGroups(category);
    const itemCount = category._items.length;
    panel.id = `tab-${category.slug}`;
    panel.className = `panel dynamic-panel ${categoryIndex === 0 ? 'active' : ''}`;
    panel.innerHTML = `
      <div class="menu-panel-head">
        <div>
          <span>${esc(localized(category, 'name', 'nameDe'))}</span>
          <strong>${itemCount}</strong>
        </div>
      </div>
      <div class="menu-groups">
        ${groups.map(group => `
          <section class="menu-group">
            <div class="menu-group-head">
              <h3>${esc(localized(group, 'name', 'nameDe'))}</h3>
              <span>${group.items.length} ${lang() === 'en' ? 'items' : lang() === 'fa' ? 'گزینه' : 'Artikel'}</span>
            </div>
            <div class="sub-panel">
              ${group.items.map((item, itemIndex) => {
          const title = localized(item, 'name', 'nameDe');
          const desc = localized(item, 'description', 'descriptionDe');
          const secondaryLine = lang() === 'fa'
            ? (item.nameDe ? `<span class="mfa mlatin">${esc(item.nameDe)}</span>` : '')
            : (item.nameFa ? `<span class="mfa">${esc(item.nameFa)}</span>` : '');
          const image = item.imageUrl ? `<div class="mi-img"><img src="${esc(item.imageUrl)}" alt="${esc(item.nameDe)}" loading="lazy"></div>` : '';
          const badge = item.isSpecial ? '<span class="mi-badge">Empfehlung</span>' : '';
          return `
            <article class="mi search-item ${item.isSpecial ? 'special-item' : ''}"
              style="--item-index:${itemIndex}"
              data-name="${esc(`${item.nameDe} ${item.nameFa || ''}`.toLowerCase())}"
              data-desc="${esc(`${item.descriptionDe || ''} ${item.descriptionFa || ''}`.toLowerCase())}">
              ${badge}
              ${image}
              <div class="mn">${esc(title)}</div>
              ${secondaryLine}
              <div class="md">${esc(desc)}</div>
              ${variantPriceLine(item)}
            </article>
          `;
              }).join('')}
            </div>
          </section>
        `).join('')}
      </div>
      <div class="menu-no-results" hidden>${lang() === 'fa' ? 'موردی پیدا نشد.' : lang() === 'en' ? 'No menu items found.' : 'Keine passenden Artikel gefunden.'}</div>
    `;
    inner.appendChild(panel);
  });

  tabsContainer.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabsContainer.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
      inner.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });

  document.getElementById('menuSearch')?.addEventListener('input', event => {
    const q = event.target.value.trim().toLowerCase();
    inner.querySelectorAll('.search-item').forEach(item => {
      const hit = item.dataset.name.includes(q) || item.dataset.desc.includes(q);
      item.style.display = hit ? '' : 'none';
    });
    inner.querySelectorAll('.menu-group').forEach(group => {
      const visible = [...group.querySelectorAll('.search-item')].some(item => item.style.display !== 'none');
      group.style.display = visible ? '' : 'none';
    });
    inner.querySelectorAll('.dynamic-panel').forEach(panel => {
      const visible = [...panel.querySelectorAll('.search-item')].some(item => item.style.display !== 'none');
      const empty = panel.querySelector('.menu-no-results');
      if (empty) empty.hidden = visible;
    });
  });
}

function ensureEventModal() {
  let modal = document.getElementById('event-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'event-modal';
  modal.className = 'event-modal';
  modal.innerHTML = `
    <div class="event-modal__backdrop" data-close-event></div>
    <div class="event-modal__panel" role="dialog" aria-modal="true" aria-label="Event Anmeldung">
      <button class="event-modal__close" type="button" data-close-event>×</button>
      <div id="event-modal-content"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-event]').forEach(el => el.addEventListener('click', closeEventModal));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeEventModal();
  });
  return modal;
}

function closeEventModal() {
  const modal = document.getElementById('event-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function openEventModal(eventData) {
  const modal = ensureEventModal();
  const content = modal.querySelector('#event-modal-content');
  const eventDate = new Date(eventData.eventDate);
  const title = localized(eventData, 'title', 'titleDe');
  const description = lang() === 'fa'
    ? (eventData.descriptionFa || eventData.descriptionFull || eventData.description || '')
    : lang() === 'en'
      ? (eventData.descriptionEn || eventData.descriptionFull || eventData.description || '')
      : (eventData.descriptionFull || eventData.description || '');
  const remaining = eventData.maxAttendees
    ? Math.max(0, Number(eventData.maxAttendees) - Number(eventData.registrationsCount || 0))
    : null;

  content.innerHTML = `
    ${eventData.imageUrl ? `<img class="event-modal__image" src="${esc(eventData.imageUrl)}" alt="${esc(title)}">` : ''}
    <p class="event-modal__date">${eventDate.toLocaleDateString(lang() === 'fa' ? 'fa-IR' : 'de-DE')} · ${esc(eventData.eventTime || '')}</p>
    <h3>${esc(title)}</h3>
    <p class="event-modal__desc">${esc(description)}</p>
    <div class="event-modal__meta">
      ${eventData.location ? `<span>${esc(eventData.location)}</span>` : ''}
      ${eventData.price ? `<span>${eur(eventData.price)}</span>` : '<span>Kostenlos</span>'}
      ${remaining !== null ? `<span>${remaining} Plätze frei</span>` : ''}
    </div>
    <form id="event-registration-form" class="event-registration-form">
      <input type="text" name="name" placeholder="Name" required>
      <input type="email" name="email" placeholder="E-Mail" required>
      <input type="tel" name="phone" placeholder="Telefon">
      <input type="number" name="guests" min="1" max="10" value="1" placeholder="Personenzahl" required>
      <textarea name="message" rows="3" placeholder="Nachricht"></textarea>
      <button class="btn-g" type="submit">Anmelden <span class="ac">↗</span></button>
      <p class="event-registration-status" aria-live="polite"></p>
    </form>
  `;

  const form = content.querySelector('#event-registration-form');
  const status = content.querySelector('.event-registration-status');
  form.addEventListener('submit', async submitEvent => {
    submitEvent.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton?.dataset.submitting === 'true') return;
    if (submitButton) {
      submitButton.dataset.submitting = 'true';
      submitButton.disabled = true;
      submitButton.textContent = lang() === 'fa' ? 'در حال ارسال...' : lang() === 'en' ? 'Submitting...' : 'Wird gesendet...';
    }
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.guests = Number(payload.guests || 1);
    status.textContent = lang() === 'fa' ? 'در حال ارسال...' : lang() === 'en' ? 'Submitting...' : 'Wird gesendet...';
    status.classList.remove('error');
    try {
      const result = await fetchJson(`${API_URL}/public/events/${eventData.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      form.innerHTML = `
        <div class="event-success">
          <strong>Ihre Anmeldung ist eingegangen.</strong>
          <span>Bestätigung: ${esc(result.confirmationNumber)}</span>
        </div>
      `;
      renderPublicEvents();
    } catch (error) {
      status.textContent = error.message || 'Anmeldung konnte nicht gesendet werden.';
      status.classList.add('error');
      if (submitButton) {
        submitButton.dataset.submitting = 'false';
        submitButton.disabled = false;
        submitButton.innerHTML = lang() === 'fa'
          ? 'ثبت نام <span class="ac">↗</span>'
          : lang() === 'en'
            ? 'Register <span class="ac">↗</span>'
            : 'Anmelden <span class="ac">↗</span>';
      }
    }
  });

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function renderPublicEvents() {
  const list = document.getElementById('public-events-list');
  if (!list) return;
  try {
    const events = await fetchJson(`${API_URL}/event-listings`);
    if (!Array.isArray(events) || events.length === 0) {
      list.innerHTML = '<div class="ei"><div></div><div><div class="ename">Neue Veranstaltungen folgen</div><div class="edesc">Aktuelle Termine werden bald hier veröffentlicht.</div></div><div class="etime"></div></div>';
      return;
    }

    list.innerHTML = events.map((eventData, idx) => {
      const date = new Date(eventData.eventDate);
      const title = localized(eventData, 'title', 'titleDe');
      const desc = lang() === 'fa' && eventData.descriptionFa
        ? eventData.descriptionFa
        : lang() === 'en' && eventData.descriptionEn
          ? eventData.descriptionEn
          : (eventData.description || eventData.descriptionFull || '');
      const soldOut = eventData.maxAttendees && Number(eventData.registrationsCount || 0) >= Number(eventData.maxAttendees);
      const canRegister = eventData.registrationOpen && !soldOut;
      return `
        <article class="ei r d${idx % 4}" data-event-id="${esc(eventData.id)}">
          <div><div class="eday">${String(date.getDate()).padStart(2, '0')}</div><div class="emon">${date.toLocaleDateString(lang() === 'fa' ? 'fa-IR' : 'de-DE', { month: 'short' })}</div></div>
          <div>
            <div class="ename">${esc(title)}</div>
            <div class="edesc">${esc(desc)}</div>
          </div>
          <div class="event-actions">
            <div class="etime">${esc(eventData.eventTime || '')}</div>
            ${eventData.registrationOpen ? `<button class="event-register" type="button" ${soldOut ? 'disabled' : ''}>${soldOut ? 'Ausgebucht' : (canRegister ? 'Anmelden' : 'Anmelden')}</button>` : ''}
          </div>
        </article>
      `;
    }).join('');

    const byId = new Map(events.map(eventData => [eventData.id, eventData]));
    list.querySelectorAll('.event-register').forEach(button => {
      button.addEventListener('click', event => {
        const card = event.currentTarget.closest('[data-event-id]');
        const eventData = byId.get(card?.dataset.eventId);
        if (eventData) openEventModal(eventData);
      });
    });
  } catch (error) {
    console.error('Failed to load events:', error);
  }
}

async function renderSiteContent() {
  try {
    const content = await fetchJson(`${API_URL}/site-content`);
    Object.entries(content).forEach(([key, block]) => {
      const activeLang = lang();
      const value = activeLang === 'fa'
        ? (block.valueFa || block.valueDe)
        : activeLang === 'en'
          ? (block.valueEn || block.valueDe || block.valueFa)
          : (block.valueDe || block.valueFa);
      if (!value) return;
      document.querySelectorAll(`[data-content-key="${key}"]`).forEach(el => {
        el.innerHTML = value;
      });
    });
  } catch (error) {
    console.error('Failed to load site content:', error);
  }
}

function initMobileNav() {
  const btn = document.getElementById('hamburger') || document.querySelector('.mham');
  const overlay = document.getElementById('mobile-overlay') || document.getElementById('mnav');
  const mobileLang = document.getElementById('mobileLang');
  if (!btn || !overlay) return;

  function setOpen(open) {
    btn.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  btn.addEventListener('click', () => setOpen(!overlay.classList.contains('open')));
  overlay.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  overlay.addEventListener('click', event => {
    if (event.target === overlay) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });
}

function initHeroMotion() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const video = hero.querySelector('.hero-video');
  const stage = hero.querySelector('.hr');
  const text = hero.querySelector('.hl');
  const scrollCue = hero.querySelector('.hscroll');
  const playBtn = hero.querySelector('.hero-play-btn');
  let current = 0;
  let target = 0;
  let ticking = false;
  let playBtnTimer;

  function showPlayBtn() {
    if (playBtn) playBtn.classList.add('visible');
  }

  function hidePlayBtn() {
    clearTimeout(playBtnTimer);
    if (playBtn) playBtn.classList.remove('visible');
  }

  function attemptPlay() {
    if (!video) return;
    const p = video.play();
    // Old browsers return undefined — assume playing
    if (!p) { video.classList.add('is-ready'); hidePlayBtn(); return; }
    clearTimeout(playBtnTimer);
    // Show tap-to-play after 2.5 s if video still hasn't started
    playBtnTimer = setTimeout(() => { if (video.paused) showPlayBtn(); }, 2500);
    p.then(() => hidePlayBtn()).catch(() => showPlayBtn());
  }

  function selectHeroVideo() {
    if (!video) return;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const ect = conn?.effectiveType;
    if (conn?.saveData || ect === 'slow-2g' || ect === '2g') return;
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const nextSrc = (mobile || ect === '3g') ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    if (!nextSrc) return;
    const filename = nextSrc.split('/').pop();
    const alreadyLoaded = video.currentSrc && video.currentSrc.endsWith(filename);
    if (alreadyLoaded) {
      // Native autoplay handles it — only intervene if still paused after data arrives
      if (!video.paused) return;
      if (video.readyState >= 3) { attemptPlay(); return; }
      video.addEventListener('canplay', attemptPlay, { once: true });
      return;
    }
    // Switch source (e.g. mobile needs lighter clip)
    video.classList.remove('is-ready');
    video.src = nextSrc;
    video.muted = true;
    video.playsInline = true;
    // Setting src triggers load automatically — never call video.load() here,
    // it would abort the in-flight request and break the play promise chain.
    video.addEventListener('canplay', attemptPlay, { once: true });
  }

  // iOS low-power mode blocks autoplay — unlock on first interaction
  const iosUnlock = () => { if (video && video.paused) attemptPlay(); };
  document.addEventListener('touchstart', iosUnlock, { once: true, passive: true });
  document.addEventListener('scroll',     iosUnlock, { once: true, passive: true });

  video?.addEventListener('playing', () => {
    video.classList.add('is-ready');
    hidePlayBtn();
  });

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      video.muted = true;
      video.play().then(() => hidePlayBtn()).catch(() => {});
    });
  }

  selectHeroVideo();
  window.addEventListener('resize', selectHeroVideo, { passive: true });

  // Parallax scroll effect — skipped for reduced-motion users
  if (reduceMotion) return;

  function render() {
    current += (target - current) * 0.08;
    const rect = hero.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    if (stage) {
      stage.style.setProperty('--hero-scroll', progress.toFixed(3));
      stage.style.setProperty('--hero-drift', `${current * -0.035}px`);
    }
    if (text) {
      text.style.transform = `translate3d(0,${current * 0.045}px,0)`;
      text.style.opacity = String(Math.max(0.2, 1 - progress * 1.15));
    }
    if (scrollCue) scrollCue.style.opacity = String(Math.max(0, 1 - progress * 3));
    ticking = Math.abs(target - current) > 0.2;
    if (ticking) requestAnimationFrame(render);
  }

  window.addEventListener('scroll', () => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < 0) return;
    target = window.scrollY;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }, { passive: true });
}

function initForms() {
  const t = (key) => translations[currentLang]?.[key] || translations['de'][key] || key;
  
  const resForm = document.getElementById('reservationForm');
  if (resForm) {
    resForm.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = resForm.querySelector('button[type="submit"]');
      const formOk = document.getElementById('form-ok');
      
      if (submitBtn.dataset.submitting === 'true') return;
      submitBtn.dataset.submitting = 'true';
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="ac">⏳</span> ${t('submitting')}`;
      
      const payload = {
        name: document.getElementById('resName').value,
        email: document.getElementById('resEmail').value,
        phone: document.getElementById('resPhone').value,
        date: document.getElementById('resDate').value,
        time: document.getElementById('resTime').value,
        guests: document.getElementById('resGuests').value,
        specialRequests: document.getElementById('resNotes').value,
      };
      try {
        await fetchJson(`${API_URL}/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        formOk.innerHTML = `<span style="color: #22c55e;">${t('resSuccess')}</span>`;
        formOk.style.display = 'block';
        resForm.reset();
      } catch (error) {
        formOk.innerHTML = `<span style="color: #ef4444;">${t('resError')}</span>`;
        formOk.style.display = 'block';
      } finally {
        submitBtn.dataset.submitting = 'false';
        submitBtn.disabled = false;
        submitBtn.innerHTML = t('resSubmit');
      }
    });
  }

  const evForm = document.getElementById('eventForm');
  if (evForm) {
    evForm.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = evForm.querySelector('button[type="submit"]');
      const formOk = document.getElementById('event-form-ok');
      
      if (submitBtn.dataset.submitting === 'true') return;
      submitBtn.dataset.submitting = 'true';
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="ac">⏳</span> ${t('submitting')}`;
      
      const payload = {
        name: document.getElementById('evName').value,
        email: document.getElementById('evEmail').value,
        phone: document.getElementById('evPhone').value,
        eventDate: document.getElementById('evDate').value,
        eventTiming: document.getElementById('evTiming').value,
        numberOfPeople: document.getElementById('evGuests').value,
        eventType: document.getElementById('evType').value,
        drinks: document.getElementById('evDrinks').value,
        cakes: document.getElementById('evCakes').value,
        food: document.getElementById('evFood').value,
        equipment: document.getElementById('evEquip').value,
        decor: document.getElementById('evDecor').value,
        otherNotes: document.getElementById('evNotes').value,
      };
      try {
        await fetchJson(`${API_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        formOk.innerHTML = `<span style="color: #22c55e;">${t('eventSuccess')}</span>`;
        formOk.style.display = 'block';
        evForm.reset();
      } catch (error) {
        formOk.innerHTML = `<span style="color: #ef4444;">${t('eventError')}</span>`;
        formOk.style.display = 'block';
      } finally {
        submitBtn.dataset.submitting = 'false';
        submitBtn.disabled = false;
        submitBtn.innerHTML = t('eventSubmit');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  renderPublicEvents();
  renderSiteContent();
  renderCapacities();
  initMobileNav();
  initHeroMotion();
  initForms();
  initLiveMenuRefresh();
});

// Listen for admin menu changes and refresh the public menu in real time.
function initLiveMenuRefresh() {
  if (typeof io !== 'function') return;
  try {
    const socket = io({ transports: ['websocket', 'polling'], reconnectionDelay: 2000 });
    let refreshTimer = null;
    socket.on('menu:updated', () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => renderMenu(), 600);
    });
  } catch (_) { /* socket optional, fallback to manual reload */ }
}

async function renderCapacities() {
  try {
    const caps = await fetchJson(`${API_URL}/public/settings/capacities`);
    const capEl = document.getElementById('dynamicCapacity');
    const capCountEl = document.getElementById('capacityCount');
    const evtCountEl = document.getElementById('eventsCount');
    if (capEl && caps.maxCapacity) capEl.textContent = caps.maxCapacity;
    if (capCountEl) {
      capCountEl.textContent = caps.maxCapacity || '60';
      capCountEl.dataset.count = caps.maxCapacity || '60';
    }
    if (evtCountEl) {
      evtCountEl.textContent = caps.eventsPerMonth || '15';
      evtCountEl.dataset.count = caps.eventsPerMonth || '15';
    }
    // Re-trigger counter animation if already intersected
    if (typeof countUp === 'function' && capCountEl) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            countUp(e.target, parseInt(e.target.dataset.count), 1600);
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.5 });
      [capCountEl, evtCountEl].forEach(el => { if (el) obs.observe(el); });
    }
  } catch (e) {
    console.warn('Could not load capacities', e);
  }
}
