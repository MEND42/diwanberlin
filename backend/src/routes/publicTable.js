const express = require('express');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const socketService = require('../services/socket');
const pushService = require('../services/push');

const router = express.Router();
const prisma = new PrismaClient();
const recentOrdersByToken = new Map();

const callLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bitte warten Sie kurz, bevor Sie erneut rufen.' },
});

async function findTableByToken(token) {
  if (!token || typeof token !== 'string') return null;
  return prisma.table.findUnique({
    where: { qrToken: token },
    select: { id: true, number: true, label: true, seats: true, status: true },
  });
}

async function loadPublicMenu() {
  return prisma.menuCategory.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: 'asc' },
    include: {
      subcategories: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      },
      items: {
        where: { isAvailable: true },
        orderBy: { sortOrder: 'asc' }
      }
    }
  });
}

function checkOrderCooldown(token) {
  const now = Date.now();
  const last = recentOrdersByToken.get(token) || 0;
  const waitMs = 2 * 60 * 1000 - (now - last);
  if (waitMs > 0) return Math.ceil(waitMs / 1000);
  return 0;
}

router.get('/table/:token', async (req, res) => {
  try {
    const table = await findTableByToken(req.params.token);
    if (!table) return res.status(404).json({ error: 'Invalid table token' });

    res.json({
      tableId: table.id,
      tableNumber: table.number,
      label: table.label,
      status: table.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load table' });
  }
});

router.post('/table/:token/call', callLimiter, async (req, res) => {
  try {
    const table = await findTableByToken(req.params.token);
    if (!table) return res.status(404).json({ error: 'Invalid table token' });

    const payload = {
      tableId: table.id,
      tableNumber: table.number,
      label: table.label,
      createdAt: new Date().toISOString(),
    };

    socketService.getIO().emit('waiter:call', payload);
    pushService.notifyRoles(['WAITER', 'MANAGER', 'OWNER'], {
      title: `Tisch ${table.number} ruft`,
      body: table.label || 'Kellner rufen',
      url: '/admin/service/floor',
      type: 'waiter',
    });
    res.json({ ok: true, ...payload });
  } catch (error) {
    res.status(500).json({ error: 'Failed to call waiter' });
  }
});

router.get('/order/:token/menu', async (req, res) => {
  try {
    const table = await findTableByToken(req.params.token);
    if (!table) return res.status(404).json({ error: 'Ungültiger Tisch-Code' });

    const categories = await loadPublicMenu();
    res.json({
      table: {
        id: table.id,
        number: table.number,
        label: table.label,
      },
      categories,
    });
  } catch (error) {
    res.status(500).json({ error: 'Speisekarte konnte nicht geladen werden' });
  }
});

async function listActiveOrders(req, res) {
  try {
    const table = await findTableByToken(req.params.token);
    if (!table) return res.status(404).json({ error: 'Invalid table token' });

    const orders = await prisma.order.findMany({
      where: { tableId: table.id, status: { not: 'PAID' } },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { menuItem: { select: { nameDe: true, nameFa: true } } },
        },
      },
    });

    res.json(orders.map(o => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
      items: o.items.map(i => ({
        nameDe: i.menuItem.nameDe,
        nameFa: i.menuItem.nameFa,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
}

// GET /api/public/table/:token/orders — active orders for status polling
router.get('/table/:token/orders', listActiveOrders);

router.get('/order/:token/status', listActiveOrders);

router.get('/order/:token/status/:orderId', async (req, res) => {
  try {
    const table = await findTableByToken(req.params.token);
    if (!table) return res.status(404).json({ error: 'Invalid table token' });

    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, tableId: table.id },
      include: {
        items: {
          include: { menuItem: { select: { nameDe: true, nameFa: true } } },
        },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      updatedAt: order.updatedAt,
      items: order.items.map(i => ({
        nameDe: i.menuItem.nameDe,
        nameFa: i.menuItem.nameFa,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

// POST /api/public/table/:token/order — place a new order
async function placeOrder(req, res) {
  try {
    const table = await findTableByToken(req.params.token);
    if (!table) return res.status(404).json({ error: 'Ungültiger Tisch-Code' });

    const waitSeconds = checkOrderCooldown(req.params.token);
    if (waitSeconds > 0) {
      return res.status(429).json({ error: `Bitte warten Sie ${waitSeconds} Sekunden vor der nächsten Bestellung.` });
    }

    const { items, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Keine Artikel im Warenkorb' });
    }
    if (items.length > 30) {
      return res.status(400).json({ error: 'Zu viele Artikel in einer Bestellung' });
    }

    // Validate quantities before hitting the DB
    for (const item of items) {
      if (typeof item.menuItemId !== 'string') {
        return res.status(400).json({ error: 'Ungültiger Artikel' });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        return res.status(400).json({ error: 'Ungültige Menge (1–20)' });
      }
    }

    // Fetch all requested items from the DB (use DB prices — never trust client prices)
    const menuItemIds = [...new Set(items.map(i => i.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });
    const menuItemMap = Object.fromEntries(menuItems.map(m => [m.id, m]));

    for (const item of items) {
      if (!menuItemMap[item.menuItemId]) {
        return res.status(400).json({ error: 'Artikel nicht mehr verfügbar' });
      }
    }

    // Build order items and calculate total from DB prices
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const menuItem = menuItemMap[item.menuItemId];
      const unitPrice = Number(menuItem.price);
      totalAmount += unitPrice * item.quantity;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        notes: typeof item.notes === 'string' ? item.notes.slice(0, 200) : null,
      };
    });

    const order = await prisma.order.create({
      data: {
        tableId: table.id,
        notes: typeof notes === 'string' ? notes.slice(0, 500) : null,
        totalAmount,
        items: { create: orderItems },
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    // Mark table occupied
    await prisma.table.update({
      where: { id: table.id },
      data: { status: 'OCCUPIED' },
    });

    socketService.getIO().emit('order:new', order);
    socketService.getIO().emit('table:updated', { id: table.id, status: 'OCCUPIED' });
    pushService.notifyRoles(['KITCHEN', 'MANAGER', 'OWNER'], {
      title: `Neue QR-Bestellung · Tisch ${order.table?.number ?? table.number}`,
      body: `#${order.orderNumber} · ${order.items?.length ?? 0} Artikel`,
      url: '/admin/kitchen',
      type: 'order',
    });
    recentOrdersByToken.set(req.params.token, Date.now());

    res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      items: order.items.map(i => ({
        nameDe: i.menuItem.nameDe,
        nameFa: i.menuItem.nameFa,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Bestellung konnte nicht aufgenommen werden' });
  }
}

// Legacy-style and Phase 5 public ordering endpoints.
router.post('/table/:token/order', placeOrder);
router.post('/order/:token', placeOrder);

module.exports = router;
