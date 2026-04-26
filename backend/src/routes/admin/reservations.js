const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../../services/socket');

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
    try { socketService.getIO().emit('reservation:updated', reservation); } catch (_) {}
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const reservation = await prisma.tableReservation.update({
      where: { id: req.params.id },
      data: req.body,
      include: { table: true }
    });
    try { socketService.getIO().emit('reservation:updated', reservation); } catch (_) {}
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const reservation = await prisma.tableReservation.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: { table: true }
    });
    try { socketService.getIO().emit('reservation:updated', reservation); } catch (_) {}
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reservation status' });
  }
});

// DELETE reservation
router.delete('/:id', async (req, res) => {
  try {
    await prisma.tableReservation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

module.exports = router;
