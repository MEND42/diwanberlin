const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api/admin'
  : '/api/admin';
let token = localStorage.getItem('diwanAdminToken');
let socket;

// Data State
let tables = [];
let orders = [];
let categories = [];
let reservations = [];
let events = [];
let eventListings = [];
let users = [];
let customers = [];
let discounts = [];
let staff = [];
let availability = [];
let shifts = [];
let timeEntries = [];
let siteContent = [];
let currentUser = { username: 'admin', role: 'OWNER' };
let currentMode = 'service';
let currentWeekStart = getWeekStart(new Date());

let currentOrderDraft = [];
let selectedTableId = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const navMenu = document.querySelector('.nav-menu');

const NAV_ITEMS = [
  { view: 'tables', title: 'Tische & POS', meta: 'Bestellen und kassieren', mode: 'service', roles: ['OWNER', 'MANAGER', 'WAITER'], icon: 'Tische & POS.png' },
  { view: 'orders', title: 'Küchen-Kanban', meta: 'Live Bestellungen', mode: 'kitchen', roles: ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'], icon: 'Kuchen-Kanban.png' },
  { view: 'menu', title: 'Speisekarte', meta: 'Kategorien und Artikel', mode: 'management', roles: ['OWNER', 'MANAGER'], icon: 'Speiskarte.png' },
  { view: 'reservations', title: 'Reservierungen', meta: 'Tische zuweisen', mode: 'management', roles: ['OWNER', 'MANAGER', 'WAITER'], icon: 'Reservierung.png', badge: 'badge-res' },
  { view: 'events', title: 'Event-Anfragen', meta: 'Anfragen bearbeiten', mode: 'management', roles: ['OWNER', 'MANAGER'], icon: 'Event-Anfragen.png', badge: 'badge-ev' },
  { view: 'event-listings', title: 'Eventkalender', meta: 'Website Events', mode: 'management', roles: ['OWNER', 'MANAGER'], icon: 'Eventkalender.png' },
  { view: 'site', title: 'Website', meta: 'Texte ohne Code', mode: 'management', roles: ['OWNER', 'MANAGER'], icon: 'Eventkalender.png' },
  { view: 'staff', title: 'Team & Zeiten', meta: 'Planung und Zeiterfassung', mode: 'management', roles: ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'], icon: 'teamkonten.png' },
  { view: 'customers', title: 'Kunden & Rabatte', meta: 'Treue und Codes', mode: 'management', roles: ['OWNER', 'MANAGER', 'WAITER'], icon: 'Kunden & Rabatte.png' },
  { view: 'users', title: 'Teamkonten', meta: 'Rollen und Zugriff', mode: 'management', roles: ['OWNER'], icon: 'teamkonten.png' }
];

const MODE_LABELS = {
  service: 'Service',
  kitchen: 'Küche',
  management: 'Management'
};

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    const sessionUser = getStoredUser();
    if (sessionUser?.role) {
      currentUser = sessionUser;
      showApp();
    } else {
      logout(false);
      showLoginMessage('Bitte erneut anmelden. Die alte Sitzung wurde erneuert.');
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        token = data.token;
        currentUser = { id: data.id, username: data.username, role: data.role || 'OWNER' };
        localStorage.setItem('diwanAdminUser', JSON.stringify(currentUser));
        localStorage.setItem('diwanAdminToken', token);
        document.getElementById('login-error').style.display = 'none';
        showApp();
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    } catch (err) {
      console.error(err);
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
  });

  document.getElementById('header-actions')?.addEventListener('click', (event) => {
    const modeButton = event.target.closest('[data-mode]');
    if (!modeButton) return;
    currentMode = modeButton.dataset.mode;
    renderNavigation();
    const first = firstAllowedNavItem(currentMode);
    if (first) activateView(first.view);
  });

  // Navigation
  navMenu?.addEventListener('click', (event) => {
    const item = event.target.closest('.nav-item');
    if (!item) return;
    activateView(item.dataset.view);
  });
});

async function apiFetch(endpoint, options = {}) {
  const headers = { 'Authorization': `Bearer ${token}` };
  if (options.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = {};
  }
  if (res.status === 401) {
    logout();
    showLoginMessage('Sitzung abgelaufen. Bitte erneut anmelden.');
    throw new Error(body.error || 'Nicht angemeldet');
  }
  if (res.status === 403) {
    throw new Error(body.error || 'Keine Berechtigung für diese Aktion');
  }
  if (!res.ok) throw new Error(body.error || `Request failed: ${res.status}`);
  return body;
}

function showLoginMessage(message) {
  const error = document.getElementById('login-error');
  if (!error) return;
  error.innerText = message;
  error.style.display = 'block';
}

function parseJwt(value) {
  try {
    const payload = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch (_) {
    return null;
  }
}

function getStoredUser() {
  try {
    const stored = JSON.parse(localStorage.getItem('diwanAdminUser'));
    if (stored?.role) return stored;
  } catch (_) {}
  const decoded = token ? parseJwt(token) : null;
  if (!decoded?.role) return null;
  return { id: decoded.id, username: decoded.username || 'admin', role: decoded.role };
}

function canAccess(item) {
  return Boolean(item?.roles?.includes(currentUser.role));
}

function firstAllowedNavItem(mode = currentMode) {
  return NAV_ITEMS.find(item => item.mode === mode && canAccess(item)) || NAV_ITEMS.find(canAccess);
}

function iconPath(fileName) {
  return `/icons/${encodeURIComponent(fileName).replace(/%2F/g, '/')}`;
}

function renderModeSwitcher() {
  const headerActions = document.getElementById('header-actions');
  if (!headerActions) return;
  headerActions.innerHTML = `
    <div class="live-pill offline" id="live-status"><span class="live-dot"></span><span>Offline</span></div>
    <div class="mode-switcher">
      ${Object.entries(MODE_LABELS).map(([mode, label]) => `
        <button class="mode-btn ${mode === currentMode ? 'active' : ''}" data-mode="${mode}">${label}</button>
      `).join('')}
    </div>
  `;
}

function renderNavigation() {
  renderModeSwitcher();
  if (!navMenu) return;
  const visible = NAV_ITEMS.filter(item => item.mode === currentMode && canAccess(item));
  navMenu.innerHTML = visible.map(item => `
    <div class="nav-item" data-view="${item.view}" data-title="${item.title}">
      <span class="nav-icon"><img src="${iconPath(item.icon)}" alt=""></span>
      <span class="nav-copy"><span class="nav-title">${item.title}</span><span class="nav-meta">${item.meta}</span></span>
      ${item.badge ? `<span class="badge" id="${item.badge}">0</span>` : ''}
    </div>
  `).join('');
}

function setLiveStatus(status) {
  const pill = document.getElementById('live-status');
  if (!pill) return;
  const label = status === 'live' ? 'Live' : status === 'reconnecting' ? 'Reconnecting' : 'Offline';
  pill.className = `live-pill ${status}`;
  pill.querySelector('span:last-child').innerText = label;
}

function logout(revealLogin = true) {
  localStorage.removeItem('diwanAdminToken');
  localStorage.removeItem('diwanAdminUser');
  token = null;
  appContainer.classList.add('hidden');
  if (revealLogin) loginScreen.classList.remove('hidden');
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function activateView(viewId) {
  const config = NAV_ITEMS.find(item => item.view === viewId);
  if (!config || !canAccess(config)) return;
  if (config.mode !== currentMode) {
    currentMode = config.mode;
    renderNavigation();
  }
  const target = document.getElementById(`view-${viewId}`);
  const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (!target || !navItem) return;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  navItem.classList.add('active');
  target.classList.add('active');
  document.getElementById('view-title').innerText = navItem.dataset.title || navItem.querySelector('.nav-title')?.innerText || 'Dashboard';
  const subtitle = {
    tables: 'Service floor, order entry and billing',
    orders: 'Kitchen status board for live tickets',
    menu: 'Categories, prices and availability',
    reservations: 'Incoming table bookings and assignments',
    events: 'Private event inquiry pipeline',
    'event-listings': 'Public website event calendar',
    customers: 'Loyalty customers and discount codes',
    users: 'Staff accounts and role access',
    staff: 'Weekly planning, shift approval and timesheets',
    site: 'Controlled no-code website content'
  };
  document.getElementById('view-subtitle').innerText = subtitle[viewId] || 'Diwan Berlin operations';
}

function renderOpsSummary() {
  const activeOrders = orders.filter(o => !['PAID', 'SERVED'].includes(o.status));
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length;
  const pendingReservations = reservations.filter(r => r.status === 'PENDING').length;
  const pendingEvents = events.filter(e => e.status === 'PENDING').length;

  const metricOrders = document.getElementById('metric-orders');
  const metricTables = document.getElementById('metric-tables');
  const metricReservations = document.getElementById('metric-reservations');
  const metricEvents = document.getElementById('metric-events');
  if (metricOrders) metricOrders.innerText = activeOrders.length;
  if (metricTables) metricTables.innerText = occupiedTables;
  if (metricReservations) metricReservations.innerText = pendingReservations;
  if (metricEvents) metricEvents.innerText = pendingEvents;
}

function showApp() {
  currentUser = getStoredUser() || currentUser;
  loginScreen.classList.add('hidden');
  appContainer.classList.remove('hidden');
  document.querySelector('.user-box span').innerText = `${currentUser.username} · ${currentUser.role}`;
  document.querySelectorAll('.manager-only').forEach(el => {
    el.style.display = ['OWNER', 'MANAGER'].includes(currentUser.role) ? '' : 'none';
  });
  currentMode = firstAllowedNavItem(currentMode)?.mode || 'service';
  renderNavigation();

  // Init Socket. The dashboard must remain usable even if the proxy script is unavailable.
  if (typeof io === 'function') {
    socket = io();
    socket.on('connect', () => setLiveStatus('live'));
    socket.on('disconnect', () => setLiveStatus('offline'));
    socket.io?.on('reconnect_attempt', () => setLiveStatus('reconnecting'));
    socket.on('table:updated', () => loadTables());
    socket.on('order:new', () => { loadOrders(); loadTables(); });
    socket.on('order:updated', () => { loadOrders(); loadTables(); });
    socket.on('reservation:new', () => loadReservations());
    socket.on('reservation:updated', () => loadReservations());
    socket.on('event:new', () => loadEvents());
    socket.on('event:updated', () => loadEvents());
    socket.on('menu:updated', () => loadMenu());
    socket.on('event-listings:updated', () => loadEventListings());
    socket.on('staff:availability-updated', () => loadHr());
    socket.on('staff:shift-updated', () => loadHr());
    socket.on('staff:time-updated', () => loadHr());
    socket.on('site-content:updated', () => loadSiteContent());
  } else {
    setLiveStatus('offline');
    console.warn('Socket.IO client unavailable; dashboard will use manual refresh.');
  }

  // Load Data
  Promise.allSettled([
    loadTables(),
    loadOrders(),
    canAccess(NAV_ITEMS.find(i => i.view === 'menu')) ? loadMenu() : Promise.resolve(),
    canAccess(NAV_ITEMS.find(i => i.view === 'reservations')) ? loadReservations() : Promise.resolve(),
    canAccess(NAV_ITEMS.find(i => i.view === 'events')) ? loadEvents() : Promise.resolve(),
    canAccess(NAV_ITEMS.find(i => i.view === 'event-listings')) ? loadEventListings() : Promise.resolve(),
    canAccess(NAV_ITEMS.find(i => i.view === 'customers')) ? loadCustomers() : Promise.resolve(),
    canAccess(NAV_ITEMS.find(i => i.view === 'customers')) ? loadDiscounts() : Promise.resolve(),
    canAccess(NAV_ITEMS.find(i => i.view === 'staff')) ? loadHr() : Promise.resolve(),
    canAccess(NAV_ITEMS.find(i => i.view === 'site')) ? loadSiteContent() : Promise.resolve(),
    currentUser.role === 'OWNER' ? loadUsers() : Promise.resolve()
  ]).then(() => renderOpsSummary());
  activateView(firstAllowedNavItem(currentMode)?.view || 'tables');
}

/* ================= TABLES & POS ================= */
async function loadTables() {
  tables = await apiFetch('/tables');
  const grid = document.getElementById('tables-grid');
  grid.innerHTML = tables.map(t => {
    const label = t.label || `Tisch ${t.number}`;
    return `
    <div class="table-card ${t.status.toLowerCase()}" onclick='openTableModal("${t.id}", ${JSON.stringify(label)})'>
      <div>
        <div class="status">${statusLabel(t.status)}</div>
        <h3>${t.number}</h3>
      </div>
      <div class="table-meta">
        ${escapeHtml(label)}<br>
        ${t.seats || 4} Sitzplätze
      </div>
    </div>
  `;
  }).join('');
  renderOpsSummary();
}

function statusLabel(status) {
  return {
    AVAILABLE: 'Frei',
    OCCUPIED: 'Besetzt',
    RESERVED: 'Reserviert'
  }[status] || status;
}

async function openTableModal(tableId, label) {
  selectedTableId = tableId;
  currentOrderDraft = [];
  document.getElementById('tm-title').innerText = label;

  // Load Bill
  const bill = await apiFetch(`/tables/${tableId}/bill`);
  const billContainer = document.getElementById('tm-bill-items');
  if (bill.items.length === 0) {
    billContainer.innerHTML = '<p style="color:var(--text-muted)">Keine offenen Bestellungen.</p>';
    document.getElementById('tm-btn-pay').style.display = 'none';
  } else {
    document.getElementById('tm-btn-pay').style.display = 'block';
    billContainer.innerHTML = bill.items.map(i => `
      <div class="order-line">
        <span>${i.quantity}x ${i.name}</span>
        <span>€ ${i.subtotal.toFixed(2)}</span>
      </div>
    `).join('');
  }
  document.getElementById('tm-bill-total').innerText = `€ ${bill.grandTotal.toFixed(2)}`;

  // Populate Categories Dropdown
  const catSelect = document.getElementById('tm-cat');
  catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.nameDe)}</option>`).join('');

  renderMenuItemsForOrder(categories[0]?.id);

  catSelect.onchange = (e) => renderMenuItemsForOrder(e.target.value);

  renderDraftOrder();
  document.getElementById('table-modal').classList.remove('hidden');
}

function renderMenuItemsForOrder(catId) {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;
  const list = document.getElementById('tm-menu-list');
  list.innerHTML = cat.items.filter(i => i.isAvailable).map(item => `
    <div class="menu-list-item">
      <span>${item.nameDe} <span style="color:var(--gold);font-size:12px;">€${item.price}</span></span>
      <button class="btn add-to-order-btn" onclick="addToDraft('${item.id}', '${item.nameDe}', ${item.price})">+</button>
    </div>
  `).join('');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}

function currentCategory() {
  const selectedId = document.getElementById('menu-cat-select')?.value;
  return categories.find(c => c.id === selectedId) || categories[0];
}

function addToDraft(id, name, price) {
  const existing = currentOrderDraft.find(i => i.menuItemId === id);
  if (existing) {
    existing.quantity++;
  } else {
    currentOrderDraft.push({ menuItemId: id, name, unitPrice: price, quantity: 1, notes: '' });
  }
  renderDraftOrder();
}

function renderDraftOrder() {
  const c = document.getElementById('tm-current-order');
  if (currentOrderDraft.length === 0) {
    c.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Noch keine Artikel hinzugefügt.</p>';
    return;
  }
  c.innerHTML = currentOrderDraft.map((item, idx) => `
    <div class="order-line" style="border-bottom:none;">
      <span style="font-size:14px;">${item.quantity}x ${item.name}</span>
      <button class="btn btn-danger" style="padding:2px 6px;font-size:10px;" onclick="removeFromDraft(${idx})">x</button>
    </div>
  `).join('');
}

function removeFromDraft(idx) {
  currentOrderDraft.splice(idx, 1);
  renderDraftOrder();
}

async function submitOrder() {
  if (currentOrderDraft.length === 0) return alert('Bitte Artikel hinzufügen');

  await apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify({
      tableId: selectedTableId,
      items: currentOrderDraft.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, unitPrice: i.unitPrice }))
    })
  });

  closeModal('table-modal');
  loadTables();
  loadOrders();
}

async function payBill() {
  if(!confirm('Rechnung als bezahlt markieren?')) return;
  const bill = await apiFetch(`/tables/${selectedTableId}/bill`);

  for (let orderId of bill.orders) {
    await apiFetch(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PAID' })
    });
  }

  closeModal('table-modal');
  loadTables();
  loadOrders();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

/* ================= KANBAN ORDERS ================= */
async function loadOrders() {
  orders = await apiFetch('/orders');

  const kbNew = document.getElementById('kb-new');
  const kbPrep = document.getElementById('kb-preparing');
  const kbReady = document.getElementById('kb-ready');

  kbNew.innerHTML = '';
  kbPrep.innerHTML = '';
  kbReady.innerHTML = '';

  orders.filter(o => o.status !== 'PAID' && o.status !== 'SERVED').forEach(order => {
    const timeStr = new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const itemsHtml = order.items.map(i => `<div class="order-item"><span>${i.quantity}x ${i.menuItem.nameDe}</span></div>`).join('');

    let actions = '';
    if (order.status === 'NEW') {
      actions = `<button class="btn" style="background:var(--warning)" onclick="updateOrderStatus('${order.id}', 'PREPARING')">Zubereiten</button>`;
    } else if (order.status === 'PREPARING') {
      actions = `<button class="btn" style="background:var(--info);color:#fff" onclick="updateOrderStatus('${order.id}', 'READY')">Bereit</button>`;
    } else if (order.status === 'READY') {
      actions = `<button class="btn" style="background:var(--success);color:#fff" onclick="updateOrderStatus('${order.id}', 'SERVED')">Serviert</button>`;
    }

    const html = `
      <div class="order-card">
        <div class="order-header">
          <span class="order-table">${order.table.label}</span>
          <span class="order-time">${timeStr}</span>
        </div>
        <div>${itemsHtml}</div>
        <div class="order-actions">${actions}</div>
      </div>
    `;

    if (order.status === 'NEW') kbNew.innerHTML += html;
    if (order.status === 'PREPARING') kbPrep.innerHTML += html;
    if (order.status === 'READY') kbReady.innerHTML += html;
  });
  renderOpsSummary();
}

async function updateOrderStatus(id, status) {
  await apiFetch(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  // Socket will trigger reload
}

/* ================= MENU ================= */
async function loadMenu() {
  categories = await apiFetch('/menu');
  const catSelect = document.getElementById('menu-cat-select');
  catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.nameDe}</option>`).join('');

  catSelect.onchange = () => renderMenuItemsAdmin(catSelect.value);
  if(categories.length > 0) renderMenuItemsAdmin(categories[0].id);
}

function renderMenuItemsAdmin(catId) {
  const cat = categories.find(c => c.id === catId);
  const tbody = document.getElementById('menu-tbody');
  if(!cat) return tbody.innerHTML = '';

  tbody.innerHTML = cat.items.map(item => `
    <tr>
      <td>${item.nameDe}</td>
      <td>${item.nameFa || '-'}</td>
      <td>€${item.price}</td>
      <td><span class="chip" style="color:${item.isAvailable ? 'var(--success)' : 'var(--danger)'}">${item.isAvailable ? 'Verfügbar' : 'Ausverkauft'}</span></td>
      <td>
        <button class="btn btn-outline btn-small" onclick="openMenuItemForm('${item.id}')">Bearbeiten</button>
        <button class="btn btn-outline btn-small" onclick="toggleMenuItem('${item.id}', ${!item.isAvailable})">${item.isAvailable ? 'Ausverkauft' : 'Verfügbar'}</button>
        <button class="btn btn-danger btn-small" onclick="deleteMenuItem('${item.id}')">Löschen</button>
      </td>
    </tr>
  `).join('');
}

function openCategoryForm(id, createNew = false) {
  const selected = createNew ? {} : (id ? categories.find(c => c.id === id) : currentCategory()) || {};
  openForm(createNew ? 'Neue Kategorie' : 'Kategorie bearbeiten', [
    { name: 'nameDe', label: 'Name Deutsch', value: selected.nameDe, required: true },
    { name: 'nameFa', label: 'Name Persisch', value: selected.nameFa, required: true },
    { name: 'slug', label: 'Slug', value: selected.slug, required: true },
    { name: 'sortOrder', label: 'Sortierung', value: selected.sortOrder || 0, type: 'number' },
    { name: 'isActive', label: 'Aktiv', value: selected.isActive === false ? 'false' : 'true', type: 'select', options: [{value:'true',label:'Ja'}, {value:'false',label:'Nein'}] }
  ], async (data) => {
    data.sortOrder = Number(data.sortOrder || 0);
    data.isActive = data.isActive === 'true';
    await apiFetch(createNew ? '/menu/categories' : `/menu/categories/${selected.id}`, {
      method: createNew ? 'POST' : 'PATCH',
      body: JSON.stringify(data)
    });
    loadMenu();
  });
}

async function deleteCurrentCategory() {
  const cat = currentCategory();
  if (!cat) return;
  if (cat.items.length > 0) {
    alert('Diese Kategorie enthält noch Artikel. Bitte zuerst Artikel löschen oder verschieben.');
    return;
  }
  if (!confirm(`Kategorie "${cat.nameDe}" wirklich löschen?`)) return;
  await apiFetch(`/menu/categories/${cat.id}`, { method: 'DELETE' });
  loadMenu();
}

function openMenuItemForm(id) {
  const cat = currentCategory();
  const item = cat?.items.find(i => i.id === id) || {};
  openForm(id ? 'Menüartikel bearbeiten' : 'Neuer Menüartikel', [
    { name: 'categoryId', label: 'Kategorie', value: item.categoryId || cat?.id, type: 'select', options: categories.map(c => ({ value: c.id, label: c.nameDe })) },
    { name: 'nameDe', label: 'Name Deutsch', value: item.nameDe, required: true },
    { name: 'nameFa', label: 'Name Persisch (فارسی)', value: item.nameFa },
    { name: 'nameEn', label: 'Name Englisch', value: item.nameEn },
    { name: 'descriptionDe', label: 'Beschreibung Deutsch', value: item.descriptionDe, type: 'textarea' },
    { name: 'descriptionFa', label: 'Beschreibung Persisch', value: item.descriptionFa, type: 'textarea' },
    { name: 'descriptionEn', label: 'Beschreibung Englisch', value: item.descriptionEn, type: 'textarea' },
    { name: 'price', label: 'Preis', value: item.price || '', type: 'number', required: true },
    { name: 'sortOrder', label: 'Sortierung', value: item.sortOrder || 0, type: 'number' },
    { name: 'isAvailable', label: 'Verfügbar', value: item.isAvailable === false ? 'false' : 'true', type: 'select', options: [{value:'true',label:'Ja'}, {value:'false',label:'Nein'}] }
  ], async (data) => {
    data.price = Number(data.price || 0);
    data.sortOrder = Number(data.sortOrder || 0);
    data.isAvailable = data.isAvailable === 'true';
    await apiFetch(id ? `/menu/items/${id}` : '/menu/items', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    });
    loadMenu();
  });
  
  if (id && item.imageUrl) {
    setTimeout(() => {
      const body = document.getElementById('form-body');
      const imgContainer = document.createElement('div');
      imgContainer.innerHTML = `<div style="margin-top:12px"><img src="${item.imageUrl}" style="max-width:120px;border-radius:8px;margin-bottom:8px"><br><button type="button" class="btn btn-outline btn-small" onclick="uploadMenuItemImage('${id}')">Neues Bild hochladen</button></div>`;
      body.appendChild(imgContainer);
    }, 100);
  }
}

async function uploadMenuItemImage(id) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('diwanAdminToken');
    await fetch(`/api/admin/menu/items/${id}/image`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    });
    loadMenu();
    alert('Bild hochgeladen!');
  };
  input.click();
}

async function toggleMenuItem(id, isAvailable) {
  await apiFetch(`/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable })
  });
  loadMenu();
}

async function deleteMenuItem(id) {
  if (!confirm('Menüartikel wirklich löschen?')) return;
  await apiFetch(`/menu/items/${id}`, { method: 'DELETE' });
  loadMenu();
}

/* ================= RESERVATIONS ================= */
async function loadReservations() {
  reservations = await apiFetch('/reservations');
  const tbody = document.getElementById('res-tbody');

  // Update badge
  const pending = reservations.filter(r => r.status === 'PENDING').length;
  const badge = document.getElementById('badge-res');
  if (badge && pending > 0) { badge.style.display = 'inline-block'; badge.innerText = pending; }
  else if (badge) { badge.style.display = 'none'; }

  tbody.innerHTML = reservations.map(r => `
    <tr>
      <td>${new Date(r.date).toLocaleDateString()} ${r.time}</td>
      <td>${r.name}</td>
      <td>${r.guests}</td>
      <td>${r.phone || r.email}</td>
      <td>
        <select onchange="updateResStatus('${r.id}', this.value)" style="background:var(--bg-dark);color:#fff;border:1px solid var(--border);padding:4px;">
          <option value="PENDING" ${r.status==='PENDING'?'selected':''}>Ausstehend</option>
          <option value="CONFIRMED" ${r.status==='CONFIRMED'?'selected':''}>Bestätigt</option>
          <option value="CANCELLED" ${r.status==='CANCELLED'?'selected':''}>Storniert</option>
        </select>
      </td>
      <td>
        <button class="btn btn-outline btn-small" onclick="openReservationDetails('${r.id}')">Details</button>
        <button class="btn btn-outline btn-small" onclick="openAssignTable('${r.id}')">Tisch</button>
        <button class="btn btn-outline btn-small" style="color:var(--danger);border-color:var(--danger)" onclick="deleteReservation('${r.id}', '${r.name}')">Löschen</button>
      </td>
    </tr>
  `).join('');
  renderOpsSummary();
}

async function updateResStatus(id, status) {
  await apiFetch(`/reservations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  loadReservations();
}

async function deleteReservation(id, name) {
  showDeleteConfirm(`Reservierung von ${name}`, async () => {
    await apiFetch(`/reservations/${id}`, { method: 'DELETE' });
    loadReservations();
  });
}

function openReservationDetails(id) {
  const r = reservations.find(x => x.id === id);
  if (!r) return;
  openForm('Reservierung', [
    { name: 'name', label: 'Name', value: r.name, required: true },
    { name: 'email', label: 'E-Mail', value: r.email, type: 'email' },
    { name: 'phone', label: 'Telefon', value: r.phone },
    { name: 'date', label: 'Datum', value: r.date?.slice(0, 10), type: 'date' },
    { name: 'time', label: 'Uhrzeit', value: r.time },
    { name: 'guests', label: 'Gäste', value: r.guests, type: 'number' },
    { name: 'specialRequests', label: 'Wünsche', value: r.specialRequests, type: 'textarea' },
    { name: 'status', label: 'Status', value: r.status, type: 'select', options: [{value:'PENDING',label:'Ausstehend'}, {value:'CONFIRMED',label:'Bestätigt'}, {value:'CANCELLED',label:'Storniert'}] }
  ], async (data) => {
    data.date = data.date ? new Date(data.date).toISOString() : r.date;
    data.guests = Number(data.guests || 1);
    await apiFetch(`/reservations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    loadReservations();
  });
}

function openAssignTable(id) {
  const reservation = reservations.find(x => x.id === id);
  openForm('Tisch zuweisen', [
    { name: 'tableId', label: 'Tisch', value: reservation?.tableId || '', type: 'select', options: [{value:'', label:'Kein Tisch'}].concat(tables.map(t => ({ value: t.id, label: `${t.label || `Tisch ${t.number}`} · ${t.status}` }))) }
  ], async (data) => {
    await apiFetch(`/reservations/${id}`, { method: 'PATCH', body: JSON.stringify({ tableId: data.tableId || null, status: data.tableId ? 'CONFIRMED' : reservation.status }) });
    loadReservations();
  });
}

/* ================= EVENTS ================= */
async function loadEvents() {
  events = await apiFetch('/events');
  const tbody = document.getElementById('ev-tbody');

  const pending = events.filter(e => e.status === 'PENDING').length;
  const badge = document.getElementById('badge-ev');
  if (badge && pending > 0) { badge.style.display = 'inline-block'; badge.innerText = pending; }
  else if (badge) { badge.style.display = 'none'; }

  tbody.innerHTML = events.map(e => `
    <tr>
      <td>${new Date(e.createdAt).toLocaleDateString()}</td>
      <td>${new Date(e.eventDate).toLocaleDateString()}</td>
      <td>${e.name}</td>
      <td>${e.eventType}</td>
      <td>${e.numberOfPeople}</td>
      <td>
        <select onchange="updateEvStatus('${e.id}', this.value)" style="background:var(--bg-dark);color:#fff;border:1px solid var(--border);padding:4px;">
          <option value="PENDING" ${e.status==='PENDING'?'selected':''}>Neu</option>
          <option value="REVIEWED" ${e.status==='REVIEWED'?'selected':''}>In Prüfung</option>
          <option value="QUOTED" ${e.status==='QUOTED'?'selected':''}>Angebot gesendet</option>
          <option value="CONFIRMED" ${e.status==='CONFIRMED'?'selected':''}>Bestätigt</option>
          <option value="CANCELLED" ${e.status==='CANCELLED'?'selected':''}>Abgesagt</option>
        </select>
      </td>
      <td><button class="btn btn-outline btn-small" onclick="openEventInquiryDetails('${e.id}')">Details</button>
      <button class="btn btn-outline btn-small" style="color:var(--danger);border-color:var(--danger)" onclick="deleteEvent('${e.id}', '${e.name}')">Löschen</button></td>
    </tr>
  `).join('');
  renderOpsSummary();
}

async function updateEvStatus(id, status) {
  await apiFetch(`/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  loadEvents();
}

async function deleteEvent(id, name) {
  showDeleteConfirm(`Event-Anfrage von ${name}`, async () => {
    await apiFetch(`/events/${id}`, { method: 'DELETE' });
    loadEvents();
  });
}

function openEventInquiryDetails(id) {
  const e = events.find(x => x.id === id);
  if (!e) return;
  openForm('Event-Anfrage', [
    { name: 'name', label: 'Name', value: e.name, required: true },
    { name: 'email', label: 'E-Mail', value: e.email, type: 'email' },
    { name: 'phone', label: 'Telefon', value: e.phone },
    { name: 'eventDate', label: 'Datum', value: e.eventDate?.slice(0, 10), type: 'date' },
    { name: 'eventTiming', label: 'Zeit/Dauer', value: e.eventTiming },
    { name: 'numberOfPeople', label: 'Gäste', value: e.numberOfPeople, type: 'number' },
    { name: 'eventType', label: 'Typ', value: e.eventType },
    { name: 'drinks', label: 'Getränke', value: e.drinks },
    { name: 'cakes', label: 'Kuchen', value: e.cakes },
    { name: 'food', label: 'Speisen', value: e.food },
    { name: 'equipment', label: 'Ausstattung', value: e.equipment },
    { name: 'decor', label: 'Dekoration', value: e.decor },
    { name: 'otherNotes', label: 'Notizen', value: e.otherNotes, type: 'textarea' },
    { name: 'status', label: 'Status', value: e.status, type: 'select', options: [{value:'PENDING',label:'Neu'}, {value:'REVIEWED',label:'In Prüfung'}, {value:'QUOTED',label:'Angebot'}, {value:'CONFIRMED',label:'Bestätigt'}, {value:'CANCELLED',label:'Abgesagt'}] }
  ], async (data) => {
    data.eventDate = data.eventDate ? new Date(data.eventDate).toISOString() : e.eventDate;
    data.numberOfPeople = Number(data.numberOfPeople || 1);
    await apiFetch(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    loadEvents();
  });
}

/* ================= GENERIC FORM MODAL ================= */
let formSubmitHandler = null;

function openForm(title, fields, onSubmit) {
  document.getElementById('form-title').innerText = title;
  document.getElementById('form-body').innerHTML = fields.map(field => {
    const value = field.value ?? '';
    if (field.type === 'select') {
      return `<div class="form-group"><label>${escapeHtml(field.label)}</label><select name="${escapeAttr(field.name)}">${field.options.map(o => `<option value="${escapeAttr(o.value)}" ${String(value) === String(o.value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select></div>`;
    }
    if (field.type === 'textarea') {
      return `<div class="form-group"><label>${escapeHtml(field.label)}</label><textarea name="${escapeAttr(field.name)}">${escapeHtml(value)}</textarea></div>`;
    }
    return `<div class="form-group"><label>${escapeHtml(field.label)}</label><input type="${field.type || 'text'}" name="${escapeAttr(field.name)}" value="${escapeAttr(value)}" ${field.required ? 'required' : ''}></div>`;
  }).join('');
  formSubmitHandler = onSubmit;
  document.getElementById('form-modal').classList.remove('hidden');
}

document.getElementById('generic-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  if (formSubmitHandler) await formSubmitHandler(data);
  closeModal('form-modal');
});

/* ================= EVENT CALENDAR CRUD ================= */
async function loadEventListings() {
  eventListings = await apiFetch('/event-listings');
  const tbody = document.getElementById('event-listings-tbody');
  if (!tbody) return;
  tbody.innerHTML = eventListings.map(e => `
    <tr>
      <td>${new Date(e.eventDate).toLocaleDateString()}</td>
      <td>${e.titleDe}<div class="muted">${e.titleFa || ''}</div></td>
      <td>${e.eventTime}</td>
      <td>${e.isPublished ? 'Ja' : 'Nein'}</td>
      <td>
        <button class="btn btn-outline" onclick="openEventListingForm('${e.id}')">Bearbeiten</button>
        <button class="btn btn-danger" onclick="deleteEventListing('${e.id}')">Löschen</button>
      </td>
    </tr>
  `).join('');
}

function openEventListingForm(id) {
  const event = eventListings.find(e => e.id === id) || {};
  openForm(id ? 'Event bearbeiten' : 'Neues Event', [
    { name: 'titleDe', label: 'Titel Deutsch', value: event.titleDe, required: true },
    { name: 'titleFa', label: 'Titel Persisch', value: event.titleFa },
    { name: 'description', label: 'Beschreibung', value: event.description, type: 'textarea' },
    { name: 'eventDate', label: 'Datum', value: event.eventDate ? event.eventDate.slice(0, 10) : '', type: 'date', required: true },
    { name: 'eventTime', label: 'Uhrzeit', value: event.eventTime || '', required: true },
    { name: 'isPublished', label: 'Sichtbar', value: event.isPublished === false ? 'false' : 'true', type: 'select', options: [{value:'true',label:'Ja'}, {value:'false',label:'Nein'}] }
  ], async (data) => {
    data.isPublished = data.isPublished === 'true';
    await apiFetch(id ? `/event-listings/${id}` : '/event-listings', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    loadEventListings();
  });
}

async function deleteEventListing(id) {
  if (!confirm('Event wirklich löschen?')) return;
  await apiFetch(`/event-listings/${id}`, { method: 'DELETE' });
  loadEventListings();
}

/* ================= USERS ================= */
async function loadUsers() {
  users = await apiFetch('/users');
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>${u.isActive ? 'Ja' : 'Nein'}</td>
      <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-outline btn-small" onclick="openUserForm('${u.id}')">Bearbeiten</button>
        <button class="btn btn-outline btn-small" style="color:var(--danger);border-color:var(--danger)" onclick="deleteUser('${u.id}', '${u.username}')" ${u.role === 'OWNER' ? 'disabled title="Cannot delete owner"' : ''}>Löschen</button>
      </td>
    </tr>
  `).join('');
}

function openUserForm(id) {
  const user = users.find(u => u.id === id) || {};
  openForm(id ? 'Teamkonto bearbeiten' : 'Teamkonto erstellen', [
    { name: 'username', label: 'Benutzername', value: user.username, required: true },
    { name: 'password', label: id ? 'Neues Passwort (optional)' : 'Passwort', type: 'password', required: !id },
    { name: 'role', label: 'Rolle', value: user.role || 'WAITER', type: 'select', options: [{value:'OWNER',label:'Owner'}, {value:'MANAGER',label:'Manager'}, {value:'WAITER',label:'Waiter'}, {value:'KITCHEN',label:'Kitchen'}] },
    { name: 'isActive', label: 'Aktiv', value: user.isActive === false ? 'false' : 'true', type: 'select', options: [{value:'true',label:'Ja'}, {value:'false',label:'Nein'}] }
  ], async (data) => {
    data.isActive = data.isActive === 'true';
    if (!data.password) delete data.password;
    await apiFetch(id ? `/users/${id}` : '/users', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    loadUsers();
  });
}

async function deleteUser(id, username) {
  if (!confirm(`Möchten Sie das Teamkonto "${username}" wirklich löschen?`)) return;
  showDeleteConfirm(`Teamkonto: ${username}`, async () => {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    loadUsers();
  });
}

/* ================= CUSTOMERS / DISCOUNTS ================= */
async function loadCustomers() {
  customers = await apiFetch('/customers');
  const tbody = document.getElementById('customers-tbody');
  if (!tbody) return;
  tbody.innerHTML = customers.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.phone || c.email || '-'}</td>
      <td>${c.points}</td>
      <td>€${Number(c.totalSpend).toFixed(2)}</td>
      <td><button class="btn btn-outline" onclick="openCustomerForm('${c.id}')">Bearbeiten</button></td>
    </tr>
  `).join('');
}

function openCustomerForm(id) {
  const c = customers.find(x => x.id === id) || {};
  openForm(id ? 'Kunde bearbeiten' : 'Kunde hinzufügen', [
    { name: 'name', label: 'Name', value: c.name, required: true },
    { name: 'email', label: 'E-Mail', value: c.email, type: 'email' },
    { name: 'phone', label: 'Telefon', value: c.phone },
    { name: 'points', label: 'Punkte', value: c.points || 0, type: 'number' },
    { name: 'notes', label: 'Notizen', value: c.notes, type: 'textarea' }
  ], async (data) => {
    data.points = Number(data.points || 0);
    await apiFetch(id ? `/customers/${id}` : '/customers', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    loadCustomers();
  });
}

async function loadDiscounts() {
  discounts = await apiFetch('/discounts');
  const tbody = document.getElementById('discounts-tbody');
  if (!tbody) return;
  tbody.innerHTML = discounts.map(d => `
    <tr>
      <td>${d.code}</td>
      <td>${d.type}</td>
      <td>${d.type === 'PERCENT' ? `${d.value}%` : `€${d.value}`}</td>
      <td>${d.pointsCost || '-'}</td>
      <td>${d.isActive ? 'Aktiv' : 'Inaktiv'}</td>
      <td><button class="btn btn-outline" onclick="openDiscountForm('${d.id}')">Bearbeiten</button></td>
    </tr>
  `).join('');
}

function openDiscountForm(id) {
  const d = discounts.find(x => x.id === id) || {};
  openForm(id ? 'Rabatt bearbeiten' : 'Rabatt erstellen', [
    { name: 'code', label: 'Code', value: d.code, required: true },
    { name: 'description', label: 'Beschreibung', value: d.description },
    { name: 'type', label: 'Typ', value: d.type || 'PERCENT', type: 'select', options: [{value:'PERCENT',label:'Prozent'}, {value:'FIXED',label:'Fixbetrag'}] },
    { name: 'value', label: 'Wert', value: d.value || '', type: 'number', required: true },
    { name: 'pointsCost', label: 'Punktekosten', value: d.pointsCost || '', type: 'number' },
    { name: 'isActive', label: 'Aktiv', value: d.isActive === false ? 'false' : 'true', type: 'select', options: [{value:'true',label:'Ja'}, {value:'false',label:'Nein'}] }
  ], async (data) => {
    data.value = Number(data.value || 0);
    data.pointsCost = data.pointsCost ? Number(data.pointsCost) : null;
    data.isActive = data.isActive === 'true';
    await apiFetch(id ? `/discounts/${id}` : '/discounts', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    loadDiscounts();
  });
}

/* ================= STAFF / HR ================= */
const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatStaffName(user) {
  return user?.staffProfile?.fullName || user?.username || 'Mitarbeiter';
}

function changeHrWeek(offset) {
  currentWeekStart.setDate(currentWeekStart.getDate() + offset * 7);
  loadHr();
}

async function loadHr() {
  if (!canAccess(NAV_ITEMS.find(i => i.view === 'staff'))) return;
  const weekStart = isoDate(currentWeekStart);
  const requests = [
    apiFetch(`/hr/availability?weekStart=${weekStart}`),
    apiFetch(`/hr/shifts?weekStart=${weekStart}`),
    apiFetch(`/hr/time-entries?weekStart=${weekStart}`)
  ];
  if (['OWNER', 'MANAGER'].includes(currentUser.role)) requests.push(apiFetch('/hr/staff'));
  const [availabilityResult, shiftsResult, timeResult, staffResult] = await Promise.allSettled(requests);
  availability = availabilityResult.value || [];
  shifts = shiftsResult.value || [];
  timeEntries = timeResult.value || [];
  if (staffResult?.value) staff = staffResult.value;
  renderHr();
}

function renderHr() {
  const label = document.getElementById('hr-week-label');
  if (label) {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    label.innerText = `Woche ${currentWeekStart.toLocaleDateString()} - ${end.toLocaleDateString()} · Öffnungszeiten 07:00-21:00`;
  }
  renderHrGrid();
  renderAvailabilityTable();
  renderTimeEntries();
}

function renderHrGrid() {
  const grid = document.getElementById('hr-grid');
  if (!grid) return;
  grid.innerHTML = dayNames.map((day, index) => {
    const dayShifts = shifts.filter(s => s.dayOfWeek === index + 1 && s.status !== 'CANCELLED');
    const dayAvailability = availability.filter(a => a.dayOfWeek === index + 1 && a.status === 'PENDING');
    return `
      <div class="hr-day">
        <strong>${day}</strong>
        ${dayShifts.map(shift => `
          <div class="shift-card">
            <b>${escapeHtml(formatStaffName(shift.adminUser))}</b><br>
            ${escapeHtml(shift.startTime)}-${escapeHtml(shift.endTime)}
            ${['OWNER', 'MANAGER'].includes(currentUser.role) ? `<button class="btn btn-outline btn-small" onclick="openShiftForm('${shift.id}')">Edit</button>` : ''}
          </div>
        `).join('') || '<div class="muted">Noch keine Schicht</div>'}
        ${dayAvailability.map(item => `
          <div class="availability-card">
            Vorschlag: ${escapeHtml(formatStaffName(item.adminUser))}<br>${escapeHtml(item.startTime)}-${escapeHtml(item.endTime)}
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
  renderCoverageWarnings();
}

function renderCoverageWarnings() {
  const c = document.getElementById('coverage-warnings');
  if (!c) return;
  const warnings = [];
  for (let day = 1; day <= 7; day++) {
    const dayShifts = shifts.filter(s => s.dayOfWeek === day && s.status !== 'CANCELLED');
    const morning = dayShifts.filter(s => s.startTime <= '12:00' && s.endTime > '07:00').length;
    const afternoon = dayShifts.filter(s => s.startTime < '17:00' && s.endTime >= '14:00').length;
    const evening = dayShifts.filter(s => s.startTime < '21:00' && s.endTime >= '18:00').length;
    if (morning < 2) warnings.push(`${dayNames[day - 1]} 07:00-12:00: nur ${morning} Person(en) geplant`);
    if (afternoon < 2) warnings.push(`${dayNames[day - 1]} 14:00-17:00: nur ${afternoon} Person(en) geplant`);
    if (evening < 2) warnings.push(`${dayNames[day - 1]} 18:00-21:00: nur ${evening} Person(en) geplant`);
  }
  c.innerHTML = warnings.slice(0, 8).map(w => `<div class="warning-item">${escapeHtml(w)}</div>`).join('');
}

function renderAvailabilityTable() {
  const tbody = document.getElementById('availability-tbody');
  if (!tbody) return;
  tbody.innerHTML = availability.map(item => `
    <tr>
      <td>${dayNames[item.dayOfWeek - 1]}</td>
      <td>${escapeHtml(formatStaffName(item.adminUser))}</td>
      <td>${escapeHtml(item.startTime)}-${escapeHtml(item.endTime)}</td>
      <td>${escapeHtml(item.status)}</td>
      <td>
        ${['OWNER', 'MANAGER'].includes(currentUser.role) ? `
          <button class="btn btn-outline btn-small" onclick="approveAvailability('${item.id}')">Genehmigen</button>
          <button class="btn btn-danger btn-small" onclick="rejectAvailability('${item.id}')">Ablehnen</button>
        ` : '-'}
      </td>
    </tr>
  `).join('');
}

function renderTimeEntries() {
  const tbody = document.getElementById('time-tbody');
  if (!tbody) return;
  tbody.innerHTML = timeEntries.map(entry => `
    <tr>
      <td>${escapeHtml(formatStaffName(entry.adminUser))}</td>
      <td>${new Date(entry.clockIn).toLocaleString()}</td>
      <td>${entry.clockOut ? new Date(entry.clockOut).toLocaleString() : '-'}</td>
      <td>${entry.breakMinutes || 0} Min.</td>
      <td>${escapeHtml(entry.status)}</td>
    </tr>
  `).join('');
}

function staffOptions() {
  const list = staff.length ? staff : [{ id: currentUser.id, username: currentUser.username, role: currentUser.role }];
  return list.map(u => ({ value: u.id, label: `${formatStaffName(u)} · ${u.role}` }));
}

function openStaffProfileForm(adminUserId) {
  const selected = staff.find(s => s.id === adminUserId) || staff[0];
  if (!selected) return alert('Bitte zuerst ein Teamkonto erstellen.');
  const profile = selected.staffProfile || {};
  openForm('Mitarbeiterprofil', [
    { name: 'adminUserId', label: 'Teamkonto', value: selected.id, type: 'select', options: staffOptions() },
    { name: 'fullName', label: 'Vollständiger Name', value: profile.fullName || selected.username, required: true },
    { name: 'phone', label: 'Telefon', value: profile.phone },
    { name: 'email', label: 'E-Mail', value: profile.email, type: 'email' },
    { name: 'position', label: 'Position', value: profile.position || selected.role },
    { name: 'notes', label: 'Notizen', value: profile.notes, type: 'textarea' },
    { name: 'isActive', label: 'Aktiv', value: profile.isActive === false ? 'false' : 'true', type: 'select', options: [{ value: 'true', label: 'Ja' }, { value: 'false', label: 'Nein' }] }
  ], async (data) => {
    const id = data.adminUserId;
    delete data.adminUserId;
    data.isActive = data.isActive === 'true';
    await apiFetch(`/hr/staff/${id}/profile`, { method: 'PUT', body: JSON.stringify(data) });
    loadHr();
  });
}

function openAvailabilityForm() {
  openForm('Arbeitszeit vorschlagen', [
    { name: 'adminUserId', label: 'Mitarbeiter', value: currentUser.id, type: 'select', options: staffOptions() },
    { name: 'weekStart', label: 'Woche ab', value: isoDate(currentWeekStart), type: 'date', required: true },
    { name: 'dayOfWeek', label: 'Tag', value: '1', type: 'select', options: dayNames.map((d, i) => ({ value: String(i + 1), label: d })) },
    { name: 'startTime', label: 'Start', value: '07:00', required: true },
    { name: 'endTime', label: 'Ende', value: '15:00', required: true },
    { name: 'note', label: 'Notiz', value: '', type: 'textarea' }
  ], async (data) => {
    await apiFetch('/hr/availability', { method: 'POST', body: JSON.stringify(data) });
    loadHr();
  });
}

async function approveAvailability(id) {
  const item = availability.find(a => a.id === id);
  if (!item) return;
  await apiFetch(`/hr/availability/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) });
  await apiFetch('/hr/shifts', {
    method: 'POST',
    body: JSON.stringify({
      adminUserId: item.adminUserId,
      weekStart: isoDate(currentWeekStart),
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      note: item.note
    })
  });
  loadHr();
}

async function rejectAvailability(id) {
  await apiFetch(`/hr/availability/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) });
  loadHr();
}

function openShiftForm(id) {
  const shift = shifts.find(s => s.id === id) || {};
  openForm(id ? 'Schicht bearbeiten' : 'Schicht eintragen', [
    { name: 'adminUserId', label: 'Mitarbeiter', value: shift.adminUserId || staffOptions()[0]?.value, type: 'select', options: staffOptions() },
    { name: 'weekStart', label: 'Woche ab', value: isoDate(currentWeekStart), type: 'date', required: true },
    { name: 'dayOfWeek', label: 'Tag', value: shift.dayOfWeek || '1', type: 'select', options: dayNames.map((d, i) => ({ value: String(i + 1), label: d })) },
    { name: 'startTime', label: 'Start', value: shift.startTime || '07:00', required: true },
    { name: 'endTime', label: 'Ende', value: shift.endTime || '15:00', required: true },
    { name: 'note', label: 'Notiz', value: shift.note, type: 'textarea' },
    { name: 'status', label: 'Status', value: shift.status || 'APPROVED', type: 'select', options: [{ value: 'APPROVED', label: 'Aktiv' }, { value: 'CANCELLED', label: 'Storniert' }] }
  ], async (data) => {
    await apiFetch(id ? `/hr/shifts/${id}` : '/hr/shifts', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    loadHr();
  });
}

async function clockIn() {
  await apiFetch('/hr/clock-in', { method: 'POST', body: JSON.stringify({}) });
  loadHr();
}

function openClockOutForm() {
  const open = timeEntries.find(e => e.adminUser?.id === currentUser.id && e.status === 'OPEN') || timeEntries.find(e => e.status === 'OPEN');
  if (!open) return alert('Keine offene Zeiterfassung gefunden.');
  openForm('Ausstempeln', [
    { name: 'breakMinutes', label: 'Pause in Minuten', value: open.breakMinutes || 0, type: 'number' }
  ], async (data) => {
    await apiFetch(`/hr/clock-out/${open.id}`, { method: 'POST', body: JSON.stringify({ breakMinutes: Number(data.breakMinutes || 0) }) });
    loadHr();
  });
}

/* ================= WEBSITE CMS ================= */
async function loadSiteContent() {
  if (!canAccess(NAV_ITEMS.find(i => i.view === 'site'))) return;
  siteContent = await apiFetch('/site-content');
  renderSiteContent();
}

function renderSiteContent() {
  const tbody = document.getElementById('site-content-tbody');
  if (!tbody) return;
  tbody.innerHTML = siteContent.map(block => `
    <tr onclick="previewSiteBlock('${block.id}')">
      <td>${escapeHtml(block.label)}</td>
      <td>${escapeHtml((block.valueDe || '').slice(0, 80))}</td>
      <td>${escapeHtml((block.valueFa || '').slice(0, 80))}</td>
      <td>${block.isPublished ? 'Live' : 'Entwurf'}</td>
      <td><button class="btn btn-outline btn-small" onclick="event.stopPropagation();openSiteContentForm('${block.id}')">Bearbeiten</button></td>
    </tr>
  `).join('');
}

function previewSiteBlock(id) {
  const block = siteContent.find(b => b.id === id);
  const preview = document.getElementById('cms-preview-text');
  if (block && preview) preview.innerText = block.valueDe || block.valueFa || 'Kein Text gesetzt.';
}

function openSiteContentForm(id) {
  const block = siteContent.find(b => b.id === id) || {};
  openForm(id ? 'Website Text bearbeiten' : 'Website Textblock hinzufügen', [
    { name: 'key', label: 'Technischer Schlüssel', value: block.key, required: true },
    { name: 'label', label: 'Name im Dashboard', value: block.label, required: true },
    { name: 'type', label: 'Typ', value: block.type || 'TEXTAREA', type: 'select', options: [{ value: 'TEXT', label: 'Kurzer Text' }, { value: 'TEXTAREA', label: 'Langer Text' }, { value: 'URL', label: 'Link' }] },
    { name: 'valueDe', label: 'Deutsch', value: block.valueDe, type: 'textarea' },
    { name: 'valueFa', label: 'Persisch', value: block.valueFa, type: 'textarea' },
    { name: 'isPublished', label: 'Sichtbar', value: block.isPublished === false ? 'false' : 'true', type: 'select', options: [{ value: 'true', label: 'Ja' }, { value: 'false', label: 'Nein' }] }
  ], async (data) => {
    data.isPublished = data.isPublished === 'true';
    await apiFetch(id ? `/site-content/${id}` : '/site-content', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    loadSiteContent();
  });
}
