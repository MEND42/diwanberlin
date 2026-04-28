const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    const blocks = await prisma.siteContentBlock.findMany({
      where: { isPublished: true }
    });
    res.json(blocks.reduce((acc, block) => {
      acc[block.key] = {
        valueDe: block.valueDe,
        valueFa: block.valueFa,
        valueEn: block.valueEn,
        type: block.type
      };
      return acc;
    }, {}));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch site content' });
  }
});

module.exports = router;
