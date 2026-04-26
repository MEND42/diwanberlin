const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

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

function flattenItems(category) {
  const direct = Array.isArray(category.items) ? category.items : [];
  const nested = Array.isArray(category.subcategories)
    ? category.subcategories.flatMap(sub => Array.isArray(sub.items) ? sub.items : [])
    : [];
  return [...direct, ...nested].filter(item => item.isAvailable !== false);
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
      tabsContainer.innerHTML = '';
      inner.querySelectorAll('.panel.dynamic-panel,.menu-extra-controls').forEach(el => el.remove());
      const fallback = document.createElement('div');
      fallback.className = 'panel dynamic-panel active';
      fallback.innerHTML = '<div class="mi"><div class="mn">Speisekarte demnächst verfügbar</div><div class="md">Unsere aktuelle Karte kann gerade nicht geladen werden.</div></div>';
      inner.appendChild(fallback);
      return;
    }
  }

  const visibleCategories = categories
    .map(category => ({ ...category, _items: flattenItems(category) }))
    .filter(category => category._items.length > 0);

  inner.querySelectorAll('.panel.dynamic-panel,.menu-extra-controls').forEach(el => el.remove());

  if (!visibleCategories.length) {
    tabsContainer.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'panel dynamic-panel active';
    empty.innerHTML = '<div class="mi"><div class="mn">Speisekarte demnächst verfügbar</div><div class="md">Neue Speisen und Getränke werden bald eingetragen.</div></div>';
    inner.appendChild(empty);
    return;
  }

  tabsContainer.innerHTML = visibleCategories.map((category, index) => {
    const label = lang() === 'fa' ? (category.nameFa || category.nameDe) : category.nameDe;
    return `<button class="tab ${index === 0 ? 'active' : ''}" data-tab="${esc(category.slug)}">${esc(label)}</button>`;
  }).join('');

  const controls = document.createElement('div');
  controls.className = 'menu-extra-controls';
  controls.innerHTML = `
    <div class="menu-tools">
      <div class="menu-search-wrap">
        <input type="search" id="menuSearch" placeholder="${lang() === 'fa' ? 'جستجو...' : 'Suchen...'}" autocomplete="off">
      </div>
      <a href="${API_URL}/menu/pdf" target="_blank" class="btn-o"><span class="pl">↓</span> PDF</a>
      ${stale ? '<span class="menu-stale">Möglicherweise veraltet</span>' : ''}
    </div>
  `;
  tabsContainer.after(controls);

  visibleCategories.forEach((category, categoryIndex) => {
    const panel = document.createElement('div');
    panel.id = `tab-${category.slug}`;
    panel.className = `panel dynamic-panel ${categoryIndex === 0 ? 'active' : ''}`;
    panel.innerHTML = `
      <div class="sub-panel">
        ${category._items.map((item, itemIndex) => {
          const title = lang() === 'fa' ? (item.nameFa || item.nameDe) : item.nameDe;
          const desc = lang() === 'fa' ? (item.descriptionFa || item.descriptionDe || '') : (item.descriptionDe || '');
          const faLine = lang() === 'de' && item.nameFa ? `<span class="mfa">${esc(item.nameFa)}</span>` : '';
          const image = item.imageUrl ? `<div class="mi-img"><img src="${esc(item.imageUrl)}" alt="${esc(item.nameDe)}" loading="lazy"></div>` : '';
          const badge = item.isSpecial ? '<span class="mi-badge">Empfehlung</span>' : '';
          return `
            <article class="mi r d${(itemIndex % 4) + 1} search-item ${item.isSpecial ? 'special-item' : ''}"
              data-name="${esc(`${item.nameDe} ${item.nameFa || ''}`.toLowerCase())}"
              data-desc="${esc(`${item.descriptionDe || ''} ${item.descriptionFa || ''}`.toLowerCase())}">
              ${badge}
              ${image}
              <div class="mn">${esc(title)}</div>
              ${faLine}
              <div class="md">${esc(desc)}</div>
              <div class="mp">${eur(item.price)}</div>
            </article>
          `;
        }).join('')}
      </div>
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
  const title = lang() === 'fa' && eventData.titleFa ? eventData.titleFa : eventData.titleDe;
  const description = lang() === 'fa'
    ? (eventData.descriptionFa || eventData.descriptionFull || eventData.description || '')
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
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.guests = Number(payload.guests || 1);
    status.textContent = 'Wird gesendet...';
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
      const title = lang() === 'fa' && eventData.titleFa ? eventData.titleFa : eventData.titleDe;
      const desc = lang() === 'fa' && eventData.descriptionFa
        ? eventData.descriptionFa
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
      const value = lang() === 'fa' ? (block.valueFa || block.valueDe) : (block.valueDe || block.valueFa);
      if (!value) return;
      document.querySelectorAll(`[data-content-key="${key}"],[data-i18n="${key}"]`).forEach(el => {
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
  mobileLang?.addEventListener('click', event => {
    event.preventDefault();
    if (typeof setLanguage === 'function') setLanguage(lang() === 'de' ? 'fa' : 'de');
  });
}

function initHeroMotion() {
  const hero = document.getElementById('hero');
  if (!hero || reduceMotion) return;

  const stage = hero.querySelector('.hero-stage') || hero.querySelector('.hr');
  const photo = hero.querySelector('.hero-photo');
  const text = hero.querySelector('.hl');
  const cards = hero.querySelectorAll('.hero-card');
  let current = 0;
  let target = 0;
  let ticking = false;

  function render() {
    current += (target - current) * 0.08;
    const y = current;
    if (stage) stage.style.transform = stage.classList.contains('hero-stage')
      ? `translateY(calc(-48% + ${y * -0.04}px))`
      : `translateY(${y * -0.035}px)`;
    if (photo) photo.style.transform = `translateY(${y * -0.02}px) scale(1.015)`;
    if (text) text.style.transform = `translateY(${y * 0.045}px)`;
    cards.forEach((card, index) => {
      const x = index % 2 === 0 ? -8 : 8;
      card.style.transform = `translate(${x}px, ${y * (0.05 + index * 0.012)}px)`;
    });
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

  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transition = 'opacity .75s ease, transform .75s cubic-bezier(0.34,1.56,0.64,1)';
    card.style.transform = `translate(${index === 0 ? -20 : 20}px, 16px)`;
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = '';
    }, 280 + index * 140);
  });
}

function initForms() {
  const resForm = document.getElementById('reservationForm');
  if (resForm) {
    resForm.addEventListener('submit', async e => {
      e.preventDefault();
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
        document.getElementById('form-ok').style.display = 'block';
        resForm.reset();
      } catch (error) {
        console.error(error);
      }
    });
  }

  const evForm = document.getElementById('eventForm');
  if (evForm) {
    evForm.addEventListener('submit', async e => {
      e.preventDefault();
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
        document.getElementById('event-form-ok').style.display = 'block';
        evForm.reset();
      } catch (error) {
        console.error(error);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  renderPublicEvents();
  renderSiteContent();
  initMobileNav();
  initHeroMotion();
  initForms();
});
