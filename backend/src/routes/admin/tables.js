const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const QRCode = require('qrcode');
const prisma = new PrismaClient();
const socketService = require('../../services/socket');
const authMiddleware = require('../../middleware/auth');

const managerOnly = authMiddleware.requireRole('OWNER', 'MANAGER');
const VALID_STATUSES = new Set(['AVAILABLE', 'OCCUPIED', 'RESERVED']);

function publicBaseUrl(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

// GET all tables
router.get('/', async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: { status: { not: 'PAID' } },
          include: { items: true }
        }
      }
    });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// PATCH table fields used by the legacy admin.
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = {};
    if (typeof req.body.status === 'string') {
      if (!VALID_STATUSES.has(req.body.status)) {
        return res.status(400).json({ error: 'Invalid table status' });
      }
      data.status = req.body.status;
    }
    if (typeof req.body.label === 'string') {
      data.label = req.body.label.trim() || null;
    }
    if (Number.isInteger(req.body.seats) && req.body.seats > 0 && req.body.seats <= 30) {
      data.seats = req.body.seats;
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No valid table fields provided' });
    }

    const table = await prisma.table.update({
      where: { id },
      data
    });
    
    socketService.getIO().emit('table:updated', table);
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// PATCH table status used by admin-v2
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid table status' });
    }

    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { status }
    });

    socketService.getIO().emit('table:updated', table);
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update table status' });
  }
});

// PATCH table label used by floor-plan annotations.
router.patch('/:id/label', async (req, res) => {
  try {
    const label = typeof req.body.label === 'string'
      ? req.body.label.trim().slice(0, 80)
      : '';

    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { label: label || null }
    });

    socketService.getIO().emit('table:updated', table);
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update table label' });
  }
});

// POST regenerate a table QR token. Restricted because printed QR codes become invalid.
router.post('/:id/regenerate-token', managerOnly, async (req, res) => {
  try {
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { qrToken: crypto.randomUUID() }
    });

    socketService.getIO().emit('table:updated', table);
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate table token' });
  }
});

// DELETE table only when it has no operational history.
router.delete('/:id', managerOnly, async (req, res) => {
  try {
    const [orders, reservations] = await Promise.all([
      prisma.order.count({ where: { tableId: req.params.id } }),
      prisma.tableReservation.count({ where: { tableId: req.params.id } }),
    ]);

    if (orders > 0 || reservations > 0) {
      return res.status(409).json({
        error: 'Dieser Tisch hat Bestellungen oder Reservierungen und kann nicht gelöscht werden. Setzen Sie ihn stattdessen auf Frei.',
      });
    }

    await prisma.table.delete({ where: { id: req.params.id } });
    socketService.getIO().emit('table:updated', { id: req.params.id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// GET downloadable QR code for the waiter-call page.
router.get('/:id/qr', async (req, res) => {
  try {
    const table = await prisma.table.findUnique({ where: { id: req.params.id } });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const target = req.query.type === 'order' ? 'order' : 'call';
    const url = `${publicBaseUrl(req).replace(/\/$/, '')}/${target}?t=${encodeURIComponent(table.qrToken)}`;
    const png = await QRCode.toBuffer(url, {
      type: 'png',
      width: 720,
      margin: 2,
      color: { dark: '#180e04', light: '#fff8ec' }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(png);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// GET downloadable QR code for the online ordering page.
router.get('/:id/qr-order', async (req, res) => {
  try {
    const table = await prisma.table.findUnique({ where: { id: req.params.id } });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const url = `${publicBaseUrl(req).replace(/\/$/, '')}/order?t=${encodeURIComponent(table.qrToken)}`;
    const png = await QRCode.toBuffer(url, {
      type: 'png',
      width: 720,
      margin: 2,
      color: { dark: '#180e04', light: '#fff8ec' }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(png);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// GET bill for a table (all unpaid orders)
router.get('/:id/bill', async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await prisma.order.findMany({
      where: { tableId: id, status: { not: 'PAID' } },
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });

    let grandTotal = 0;
    const allItems = [];

    orders.forEach(order => {
      grandTotal += Number(order.totalAmount);
      order.items.forEach(item => {
        allItems.push({
          name: item.menuItem.nameDe,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: Number(item.unitPrice) * item.quantity
        });
      });
    });

    res.json({ grandTotal, items: allItems, orders: orders.map(o => o.id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

module.exports = router;
