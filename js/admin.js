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

let currentOrderDraft = [];
let selectedTableId = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showApp();
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
    localStorage.removeItem('diwanAdminToken');
    token = null;
    appContainer.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    if (socket) socket.disconnect();
  });

  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const viewId = item.dataset.view;
      
      views.forEach(v => v.classList.remove('active'));
      document.getElementById('view-' + viewId).classList.add('active');
      document.getElementById('view-title').innerText = item.innerText.split(' 0')[0].trim();
    });
  });
});

async function apiFetch(endpoint, options = {}) {
  const headers = { 'Authorization': `Bearer ${token}` };
  if (options.body) headers['Content-Type'] = 'application/json';
  
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('diwanAdminToken');
    location.reload();
  }
  return res.json();
}

function showApp() {
  loginScreen.classList.add('hidden');
  appContainer.classList.remove('hidden');
  
  // Init Socket
  socket = io('http://localhost:3000');
  
  socket.on('table:updated', () => loadTables());
  socket.on('order:new', () => { loadOrders(); loadTables(); });
  socket.on('order:updated', () => { loadOrders(); loadTables(); });
  socket.on('reservation:new', () => loadReservations());
  socket.on('event:new', () => loadEvents());

  // Load Data
  loadTables();
  loadOrders();
  loadMenu();
  loadReservations();
  loadEvents();
}

/* ================= TABLES & POS ================= */
async function loadTables() {
  tables = await apiFetch('/tables');
  const grid = document.getElementById('tables-grid');
  grid.innerHTML = tables.map(t => `
    <div class="table-card ${t.status.toLowerCase()}" onclick="openTableModal('${t.id}', '${t.label}')">
      <h3>${t.number}</h3>
      <div class="status">${t.status === 'AVAILABLE' ? 'FREI' : 'BESETZT'}</div>
    </div>
  `).join('');
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
  catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.nameDe}</option>`).join('');
  
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
      <td>${item.isAvailable ? '<span style="color:var(--success)">Ja</span>' : '<span style="color:var(--danger)">Nein</span>'}</td>
      <td>
        <button class="btn btn-outline" style="padding:4px 8px;font-size:12px;">Bearbeiten</button>
      </td>
    </tr>
  `).join('');
}

/* ================= RESERVATIONS ================= */
async function loadReservations() {
  reservations = await apiFetch('/reservations');
  const tbody = document.getElementById('res-tbody');
  
  // Update badge
  const pending = reservations.filter(r => r.status === 'PENDING').length;
  const badge = document.getElementById('badge-res');
  if(pending > 0) { badge.style.display = 'inline-block'; badge.innerText = pending; } 
  else { badge.style.display = 'none'; }

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
      <td>-</td>
    </tr>
  `).join('');
}

async function updateResStatus(id, status) {
  await apiFetch(`/reservations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  loadReservations();
}

/* ================= EVENTS ================= */
async function loadEvents() {
  events = await apiFetch('/events');
  const tbody = document.getElementById('ev-tbody');
  
  const pending = events.filter(e => e.status === 'NEW').length;
  const badge = document.getElementById('badge-ev');
  if(pending > 0) { badge.style.display = 'inline-block'; badge.innerText = pending; } 
  else { badge.style.display = 'none'; }

  tbody.innerHTML = events.map(e => `
    <tr>
      <td>${new Date(e.createdAt).toLocaleDateString()}</td>
      <td>${new Date(e.eventDate).toLocaleDateString()}</td>
      <td>${e.name}</td>
      <td>${e.eventType}</td>
      <td>${e.numberOfPeople}</td>
      <td>
        <select onchange="updateEvStatus('${e.id}', this.value)" style="background:var(--bg-dark);color:#fff;border:1px solid var(--border);padding:4px;">
          <option value="NEW" ${e.status==='NEW'?'selected':''}>Neu</option>
          <option value="REVIEWING" ${e.status==='REVIEWING'?'selected':''}>In Prüfung</option>
          <option value="QUOTED" ${e.status==='QUOTED'?'selected':''}>Angebot gesendet</option>
          <option value="CONFIRMED" ${e.status==='CONFIRMED'?'selected':''}>Bestätigt</option>
          <option value="CANCELLED" ${e.status==='CANCELLED'?'selected':''}>Abgesagt</option>
        </select>
      </td>
      <td><button class="btn btn-outline" style="padding:4px 8px;font-size:12px;" onclick="alert('Details: ${e.otherNotes || 'Keine'}')">Details</button></td>
    </tr>
  `).join('');
}

async function updateEvStatus(id, status) {
  await apiFetch(`/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  loadEvents();
}
