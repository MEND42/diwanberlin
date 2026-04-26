import { apiFetch } from './api.js';
import { verifySession } from './core.js';
import { createSocket } from './socket.js';
import { pulse } from './haptics.js';
import { spring } from './motion.js';

const session = await verifySession(['OWNER', 'MANAGER', 'WAITER', 'KITCHEN']);
let orders = [];

if (session) init();

async function init() {
  createSocket(document.getElementById('live-status'), {
    'order:new': loadOrders,
    'order:updated': loadOrders
  });
  await loadOrders();
}

async function loadOrders() {
  orders = await apiFetch('/orders');
  renderTickets();
}

function renderTickets() {
  const buckets = {
    NEW: document.getElementById('tickets-new'),
    PREPARING: document.getElementById('tickets-preparing'),
    READY: document.getElementById('tickets-ready')
  };
  Object.values(buckets).forEach(bucket => bucket.innerHTML = '');

  orders.filter(order => ['NEW', 'PREPARING', 'READY'].includes(order.status)).forEach(order => {
    const ticket = document.createElement('button');
    ticket.className = 'ticket';
    ticket.innerHTML = `
      <strong>${order.table?.label || `Tisch ${order.table?.number || ''}`}</strong>
      <div class="ticket-time">${ageLabel(order.createdAt)}</div>
      <div>${order.items.map(item => `${item.quantity}x ${item.menuItem.nameDe}`).join('<br>')}</div>
    `;
    let holdTimer;
    ticket.addEventListener('click', () => advance(order));
    ticket.addEventListener('dblclick', () => markReady(order));
    ticket.addEventListener('pointerdown', () => {
      holdTimer = setTimeout(() => recall(order), 650);
    });
    ticket.addEventListener('pointerup', () => clearTimeout(holdTimer));
    ticket.addEventListener('pointerleave', () => clearTimeout(holdTimer));
    ticket.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      recall(order);
    });
    buckets[order.status]?.appendChild(ticket);
    spring(ticket, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 'gentle');
  });
}

async function markReady(order) {
  if (order.status === 'READY') return;
  pulse('success');
  await apiFetch(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'READY' }) });
  await loadOrders();
}

async function advance(order) {
  const next = { NEW: 'PREPARING', PREPARING: 'READY', READY: 'SERVED' }[order.status];
  if (!next) return;
  pulse('success');
  await apiFetch(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
  await loadOrders();
}

async function recall(order) {
  const previous = { READY: 'PREPARING', PREPARING: 'NEW' }[order.status];
  if (!previous) return;
  pulse('error');
  await apiFetch(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: previous }) });
  await loadOrders();
}

function ageLabel(dateValue) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(dateValue).getTime()) / 60000));
  return `${mins} Min.`;
}
