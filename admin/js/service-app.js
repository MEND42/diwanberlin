import { apiFetch } from './api.js';
import { verifySession, logout } from './core.js';
import { createSocket } from './socket.js';
import { openSheet, closeSheet } from './primitives.js';
import { pulse } from './haptics.js';

const session = await verifySession(['OWNER', 'MANAGER', 'WAITER']);
let tables = [];
let orders = [];
let reservations = [];
let activeView = 'tables';

if (session) init();

async function init() {
  document.getElementById('sheet').addEventListener('click', (event) => {
    if (event.target.id === 'sheet') closeSheet();
  });
  document.querySelector('.bottom-tabs').addEventListener('click', handleTab);
  document.getElementById('quick-action').addEventListener('click', () => {
    openSheet(`<h2>Schnellaktionen</h2><p class="muted">Neue Bestellung, Reservierung und Kassenfunktionen werden hier als Radial-Menü ausgebaut.</p><button class="primary-action" onclick="location.href='/admin/manage.html'">Management öffnen</button>`);
  });

  createSocket(document.getElementById('live-status'), {
    'table:updated': loadTables,
    'order:new': loadAll,
    'order:updated': loadAll,
    'reservation:new': loadAll,
    'reservation:updated': loadAll
  });
  await loadAll();
}

async function loadAll() {
  [tables, orders, reservations] = await Promise.all([
    apiFetch('/tables'),
    apiFetch('/orders'),
    apiFetch('/reservations')
  ]);
  renderActiveView();
}

async function loadTables() {
  tables = await apiFetch('/tables');
  if (activeView === 'tables') renderTables();
}

function renderActiveView() {
  document.getElementById('service-view-title').textContent = {
    tables: 'Tische',
    orders: 'Bestellungen',
    reservations: 'Reservierungen',
    more: 'Mehr'
  }[activeView];
  document.getElementById('table-grid').hidden = activeView !== 'tables';
  document.getElementById('service-list').hidden = activeView === 'tables';
  if (activeView === 'tables') renderTables();
  if (activeView === 'orders') renderOrders();
  if (activeView === 'reservations') renderReservations();
  if (activeView === 'more') renderMore();
}

function renderTables() {
  const grid = document.getElementById('table-grid');
  grid.innerHTML = tables.map(table => {
    const status = table.status.toLowerCase();
    const total = table.orders?.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0) || 0;
    return `
      <button class="table-tile" data-table-id="${table.id}">
        <span class="status-pill status-${status}">${labelStatus(table.status)}</span>
        <strong>${table.number}</strong>
        <span>${table.seats || 4} Plätze · €${total.toFixed(2)}</span>
      </button>
    `;
  }).join('');
  grid.querySelectorAll('[data-table-id]').forEach(tile => {
    tile.addEventListener('click', () => openTable(tile.dataset.tableId));
  });
}

function renderOrders() {
  const list = document.getElementById('service-list');
  const active = orders.filter(order => !['PAID', 'SERVED'].includes(order.status));
  list.innerHTML = active.map(order => `
    <button class="list-row" data-order-id="${order.id}">
      <strong>${order.table?.label || `Tisch ${order.table?.number || ''}`}</strong>
      <span>${order.status} · €${Number(order.totalAmount).toFixed(2)}</span>
    </button>
  `).join('') || '<p class="muted">Keine aktiven Bestellungen.</p>';
}

function renderReservations() {
  const list = document.getElementById('service-list');
  list.innerHTML = reservations.slice(0, 12).map(item => `
    <button class="list-row" data-reservation-id="${item.id}">
      <strong>${item.name}</strong>
      <span>${new Date(item.date).toLocaleDateString()} · ${item.time} · ${item.guests} Gäste</span>
    </button>
  `).join('') || '<p class="muted">Keine Reservierungen.</p>';
}

function renderMore() {
  document.getElementById('service-list').innerHTML = `
    <div class="panel-card" style="padding:16px;">
      <h2>Service Aktionen</h2>
      <p class="muted">Management bleibt für volle Bearbeitung verfügbar.</p>
      <button class="primary-action" onclick="location.href='/admin/manage.html'">Management öffnen</button>
      <button class="ghost-action" onclick="logout()" style="margin-left:8px;">Logout</button>
    </div>
  `;
}

function openTable(id) {
  const table = tables.find(item => item.id === id);
  if (!table) return;
  pulse('tap');
  const total = table.orders?.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0) || 0;
  openSheet(`
    <h2>Tisch ${table.number}</h2>
    <p class="muted">${labelStatus(table.status)} · ${table.seats || 4} Plätze</p>
    <div class="panel-card" style="padding:16px;margin:16px 0;">
      <span>Offene Rechnung</span>
      <strong style="display:block;font-size:34px;margin-top:6px;">€${total.toFixed(2)}</strong>
    </div>
    <button class="primary-action" onclick="location.href='/admin/manage.html'">Bestellung bearbeiten</button>
  `);
}

function handleTab(event) {
  const button = event.target.closest('button');
  if (!button) return;
  pulse('tap');
  document.querySelectorAll('.bottom-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  activeView = button.dataset.view;
  renderActiveView();
}

function labelStatus(status) {
  return { AVAILABLE: 'Frei', OCCUPIED: 'Besetzt', RESERVED: 'Reserviert' }[status] || status;
}

window.logout = logout;
