const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../../services/socket');
const pushService = require('../../services/push');

async function findOrder(id) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      items: { include: { menuItem: true } }
    }
  });
}

async function setOrderStatus(id, status) {
  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      table: true,
      items: { include: { menuItem: true } }
    }
  });

  if (status === 'PAID') {
    const unpaidOrders = await prisma.order.count({
      where: { tableId: order.tableId, status: { not: 'PAID' } }
    });
    if (unpaidOrders === 0) {
      const table = await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'AVAILABLE' }
      });
      socketService.getIO().emit('table:updated', table);
    }
  }

  socketService.getIO().emit('order:updated', order);
  return order;
}

// GET all orders
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        table: true,
        items: { include: { menuItem: true } }
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET all orders for a single table
router.get('/table/:tableId', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { tableId: req.params.tableId },
      orderBy: { createdAt: 'desc' },
      include: {
        table: true,
        items: { include: { menuItem: true } }
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table orders' });
  }
});

// POST new order
router.post('/', async (req, res) => {
  try {
    const { tableId, items, notes } = req.body;
    
    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.unitPrice * item.quantity;
    }

    const order = await prisma.order.create({
      data: {
        tableId,
        notes,
        totalAmount,
        items: {
          create: items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes
          }))
        }
      },
      include: {
        table: true,
        items: { include: { menuItem: true } }
      }
    });

    // Update table status to OCCUPIED if it was available
    await prisma.table.update({
      where: { id: tableId },
      data: { status: 'OCCUPIED' }
    });

    socketService.getIO().emit('order:new', order);
    socketService.getIO().emit('table:updated', { id: tableId, status: 'OCCUPIED' });
    pushService.notifyRoles(['KITCHEN', 'MANAGER', 'OWNER'], {
      title: `Neue Bestellung · Tisch ${order.table?.number ?? '?'}`,
      body: `#${order.orderNumber} · ${order.items?.length ?? 0} Artikel`,
      url: '/admin-v2/kitchen',
      type: 'order',
    });
    
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PATCH order status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await setOrderStatus(id, status);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// PATCH order status used by admin-v2.
router.patch('/:id/status', async (req, res) => {
  try {
    const order = await setOrderStatus(req.params.id, req.body.status);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// POST mark one order as paid. Keeps split-bill behavior simple and reliable.
router.post('/:id/pay', async (req, res) => {
  try {
    const order = await findOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'PAID') return res.json(order);

    const paid = await setOrderStatus(req.params.id, 'PAID');
    res.json(paid);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark order as paid' });
  }
});

module.exports = router;
