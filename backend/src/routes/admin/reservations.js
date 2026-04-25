const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all reservations
router.get('/', async (req, res) => {
  try {
    const reservations = await prisma.tableReservation.findMany({
      orderBy: { date: 'asc' },
      include: { table: true }
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// PATCH reservation status/table
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await prisma.tableReservation.update({
      where: { id },
      data: req.body
    });
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

module.exports = router;
