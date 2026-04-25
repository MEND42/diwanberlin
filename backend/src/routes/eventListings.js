const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const events = await prisma.eventListing.findMany({
      where: { isPublished: true, eventDate: { gte: new Date(new Date().toDateString()) } },
      orderBy: [{ eventDate: 'asc' }, { sortOrder: 'asc' }],
      take: 8
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;
