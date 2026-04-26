const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const managers = authMiddleware.requireRole('OWNER', 'MANAGER');

router.get('/', async (_req, res) => {
  try {
    const settings = await prisma.siteSettings.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.get('/public', async (_req, res) => {
  try {
    const settings = await prisma.siteSettings.findMany({
      where: { category: 'capacities' },
      select: { key: true, value: true }
    });
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: req.params.key }
    });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

router.post('/', managers, async (req, res) => {
  try {
    const { key, value, valueDe, valueFa, valueEn, type, category } = req.body;
    const setting = await prisma.siteSettings.upsert({
      where: { key },
      update: { value, valueDe, valueFa, valueEn, type, category },
      create: { key, value, valueDe, valueFa, valueEn, type: type || 'STRING', category: category || 'general' }
    });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create/update setting' });
  }
});

router.patch('/:key', managers, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, valueDe, valueFa, valueEn, type, category } = req.body;
    const setting = await prisma.siteSettings.update({
      where: { key },
      data: { ...(value !== undefined && { value }), ...(valueDe !== undefined && { valueDe }), ...(valueFa !== undefined && { valueFa }), ...(valueEn !== undefined && { valueEn }), ...(type !== undefined && { type }), ...(category !== undefined && { category }) }
    });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

router.delete('/:key', managers, async (req, res) => {
  try {
    await prisma.siteSettings.delete({ where: { key: req.params.key } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

module.exports = router;