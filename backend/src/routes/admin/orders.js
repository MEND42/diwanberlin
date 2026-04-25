const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../../services/socket');

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
    
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { table: true }
    });

    // If order is marked as PAID, check if table has other unpaid orders, if not set AVAILABLE
    if (status === 'PAID') {
      const unpaidOrders = await prisma.order.count({
        where: { tableId: order.tableId, status: { not: 'PAID' } }
      });
      if (unpaidOrders === 0) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' }
        });
        socketService.getIO().emit('table:updated', { id: order.tableId, status: 'AVAILABLE' });
      }
    }

    socketService.getIO().emit('order:updated', order);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
