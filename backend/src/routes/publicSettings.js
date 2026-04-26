const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/capacities', async (_req, res) => {
  try {
    const settings = await prisma.siteSettings.findMany({
      where: { category: 'capacities' }
    });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    if (!result.maxCapacity) result.maxCapacity = '60';
    if (!result.eventsPerMonth) result.eventsPerMonth = '15';
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch capacities' });
  }
});

module.exports = router;