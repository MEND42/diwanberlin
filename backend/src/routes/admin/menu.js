const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all categories and items (including inactive)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// POST new category
router.post('/categories', async (req, res) => {
  try {
    const { nameDe, nameFa, slug, sortOrder, isActive } = req.body;
    const category = await prisma.menuCategory.create({
      data: { nameDe, nameFa, slug, sortOrder, isActive }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PATCH category
router.patch('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.menuCategory.update({
      where: { id },
      data: req.body
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// POST new item
router.post('/items', async (req, res) => {
  try {
    const item = await prisma.menuItem.create({
      data: req.body
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PATCH item
router.patch('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.menuItem.update({
      where: { id },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE item
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
