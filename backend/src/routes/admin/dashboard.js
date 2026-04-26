const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      activeOrders,
      occupiedTables,
      totalTables,
      pendingReservations,
      pendingEvents,
      paidToday,
      staffClockedIn,
    ] = await Promise.all([
      prisma.order.count({ where: { status: { in: ['NEW', 'PREPARING', 'READY', 'SERVED'] } } }),
      prisma.table.count({ where: { status: 'OCCUPIED' } }),
      prisma.table.count(),
      prisma.tableReservation.count({ where: { status: 'PENDING' } }),
      prisma.eventInquiry.count({ where: { status: 'PENDING' } }),
      prisma.order.findMany({
        where: { status: 'PAID', updatedAt: { gte: startOfDay } },
        select: { totalAmount: true },
      }),
      prisma.timeEntry.count({ where: { clockOut: null } }),
    ]);

    const todayRevenue = paidToday.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    res.json({
      activeOrders,
      occupiedTables,
      totalTables,
      pendingReservations,
      pendingEvents,
      todayRevenue,
      staffClockedIn,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dashboard metrics' });
  }
});

module.exports = router;
