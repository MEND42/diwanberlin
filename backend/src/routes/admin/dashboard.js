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

router.get('/busy-hours', async (_req, res) => {
  try {
    const now = new Date();
    const daysAgo = 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);

    const reservations = await prisma.tableReservation.findMany({
      where: {
        date: { gte: startDate },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { date: true, time: true, guests: true },
    });

    const hourlyCounts = Array.from({ length: 14 }, (_, i) => ({
      hour: i + 8,
      count: 0,
      guests: 0,
    }));

    reservations.forEach(r => {
      const hourMatch = r.time?.match(/^(\d{1,2}):/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1], 10);
        if (hour >= 8 && hour <= 21) {
          const idx = hourlyCounts.findIndex(h => h.hour === hour);
          if (idx !== -1) {
            hourlyCounts[idx].count++;
            hourlyCounts[idx].guests += r.guests || 0;
          }
        }
      }
    });

    res.json(hourlyCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load busy hours' });
  }
});

module.exports = router;
