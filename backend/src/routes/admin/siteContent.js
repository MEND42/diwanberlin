const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../../middleware/auth');
const socketService = require('../../services/socket');

const router = express.Router();
const prisma = new PrismaClient();
const managers = authMiddleware.requireRole('OWNER', 'MANAGER');

function emit(payload) {
  try {
    socketService.getIO().emit('site-content:updated', payload);
  } catch (_) {}
}

router.get('/', managers, async (_req, res) => {
  const blocks = await prisma.siteContentBlock.findMany({ orderBy: { label: 'asc' } });
  res.json(blocks);
});

router.post('/', managers, async (req, res) => {
  try {
    const block = await prisma.siteContentBlock.create({
      data: {
        key: req.body.key,
        label: req.body.label,
        type: req.body.type || 'TEXT',
        valueDe: req.body.valueDe || null,
        valueFa: req.body.valueFa || null,
        isPublished: req.body.isPublished !== false
      }
    });
    emit(block);
    res.status(201).json(block);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create content block' });
  }
});

router.patch('/:id', managers, async (req, res) => {
  try {
    const block = await prisma.siteContentBlock.update({
      where: { id: req.params.id },
      data: req.body
    });
    emit(block);
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update content block' });
  }
});

module.exports = router;
