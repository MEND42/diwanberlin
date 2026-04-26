const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const managers = authMiddleware.requireRole('OWNER', 'MANAGER');

function normalizeDiscount(data) {
  const normalized = { ...data };
  if (normalized.value !== undefined) normalized.value = Number(normalized.value);
  if (normalized.minSpend === '') normalized.minSpend = null;
  if (normalized.minSpend !== undefined && normalized.minSpend !== null) normalized.minSpend = Number(normalized.minSpend);
  if (normalized.pointsCost === '') normalized.pointsCost = null;
  if (normalized.pointsCost !== undefined && normalized.pointsCost !== null) normalized.pointsCost = Number(normalized.pointsCost);
  if (normalized.expiresAt === '') normalized.expiresAt = null;
  if (normalized.expiresAt) normalized.expiresAt = new Date(normalized.expiresAt);
  return normalized;
}

router.get('/', async (req, res) => {
  const discounts = await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(discounts);
});

router.post('/', managers, async (req, res) => {
  try {
    const discount = await prisma.discount.create({ data: normalizeDiscount(req.body) });
    res.status(201).json(discount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create discount' });
  }
});

router.patch('/:id', managers, async (req, res) => {
  try {
    const discount = await prisma.discount.update({ where: { id: req.params.id }, data: normalizeDiscount(req.body) });
    res.json(discount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update discount' });
  }
});

router.put('/:id', managers, async (req, res) => {
  try {
    const discount = await prisma.discount.update({ where: { id: req.params.id }, data: normalizeDiscount(req.body) });
    res.json(discount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update discount' });
  }
});

module.exports = router;
