const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../../middleware/auth');
const socketService = require('../../services/socket');

const router = express.Router();
const prisma = new PrismaClient();
const managers = authMiddleware.requireRole('OWNER', 'MANAGER');

function emit(payload) {
  try {
    socketService.getIO().emit('event-listings:updated', payload);
  } catch (_) {}
}

router.get('/', async (req, res) => {
  const events = await prisma.eventListing.findMany({
    orderBy: [{ eventDate: 'asc' }, { sortOrder: 'asc' }]
  });
  res.json(events);
});

router.post('/', managers, async (req, res) => {
  try {
    const event = await prisma.eventListing.create({
      data: { ...req.body, eventDate: new Date(req.body.eventDate) }
    });
    emit(event);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.patch('/:id', managers, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.eventDate) data.eventDate = new Date(data.eventDate);
    const event = await prisma.eventListing.update({ where: { id: req.params.id }, data });
    emit(event);
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/:id', managers, async (req, res) => {
  try {
    await prisma.eventListing.delete({ where: { id: req.params.id } });
    emit({ id: req.params.id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
