const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../../services/socket');
const authMiddleware = require('../../middleware/auth');
const managers = authMiddleware.requireRole('OWNER', 'MANAGER');

// GET all event inquiries
router.get('/', managers, async (req, res) => {
  try {
    const events = await prisma.eventInquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event inquiries' });
  }
});

router.get('/:id/registrations', managers, async (req, res) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventListingId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event registrations' });
  }
});

router.patch('/registrations/:registrationId', managers, async (req, res) => {
  try {
    const registration = await prisma.eventRegistration.update({
      where: { id: req.params.registrationId },
      data: { status: req.body.status },
    });
    try { socketService.getIO().emit('event:registration:updated', registration); } catch (_) {}
    res.json(registration);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event registration' });
  }
});

// PATCH event inquiry status
router.patch('/:id', managers, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.eventInquiry.update({
      where: { id },
      data: req.body
    });
    try { socketService.getIO().emit('event:updated', event); } catch (_) {}
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event inquiry' });
  }
});

router.patch('/:id/status', managers, async (req, res) => {
  try {
    const event = await prisma.eventInquiry.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    try { socketService.getIO().emit('event:updated', event); } catch (_) {}
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event inquiry status' });
  }
});

// DELETE event inquiry
router.delete('/:id', managers, async (req, res) => {
  try {
    await prisma.eventInquiry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event inquiry' });
  }
});

module.exports = router;
