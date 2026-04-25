const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all event inquiries
router.get('/', async (req, res) => {
  try {
    const events = await prisma.eventInquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event inquiries' });
  }
});

// PATCH event inquiry status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.eventInquiry.update({
      where: { id },
      data: req.body
    });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event inquiry' });
  }
});

module.exports = router;
