const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../../services/socket');

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

// PATCH table status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const table = await prisma.table.update({
      where: { id },
      data: req.body
    });
    
    socketService.getIO().emit('table:updated', table);
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update table' });
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
