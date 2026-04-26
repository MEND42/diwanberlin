const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const events = await prisma.eventListing.findMany({
      where: { isPublished: true, eventDate: { gte: new Date(new Date().toDateString()) } },
      orderBy: [{ eventDate: 'asc' }, { sortOrder: 'asc' }],
      take: 8,
      include: {
        registrations: {
          where: { status: { not: 'CANCELLED' } },
          select: { guests: true },
        },
      },
    });
    res.json(events.map(event => {
      const registrationsCount = event.registrations.reduce((sum, registration) => sum + registration.guests, 0);
      const { registrations, ...rest } = event;
      return {
        ...rest,
        registrationsCount,
      };
    }));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;
