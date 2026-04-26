const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../../services/socket');
const authMiddleware = require('../../middleware/auth');
const managers = authMiddleware.requireRole('OWNER', 'MANAGER');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const upload = multer({ storage: multer.memoryStorage() });

function emitMenuUpdated(payload) {
  try {
    socketService.getIO().emit('menu:updated', payload);
  } catch (_) {}
}

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
router.post('/categories', managers, async (req, res) => {
  try {
    const { nameDe, nameFa, slug, sortOrder, isActive } = req.body;
    const category = await prisma.menuCategory.create({
      data: { nameDe, nameFa, slug, sortOrder, isActive }
    });
    emitMenuUpdated(category);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PATCH category
router.patch('/categories/:id', managers, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.menuCategory.update({
      where: { id },
      data: req.body
    });
    emitMenuUpdated(category);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category
router.delete('/categories/:id', managers, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuCategory.delete({ where: { id } });
    emitMenuUpdated({ id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// POST new item
router.post('/items', managers, async (req, res) => {
  try {
    const item = await prisma.menuItem.create({
      data: req.body
    });
    emitMenuUpdated(item);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PATCH item
router.patch('/items/:id', managers, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.menuItem.update({
      where: { id },
      data: req.body
    });
    emitMenuUpdated(item);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE item
router.delete('/items/:id', managers, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    emitMenuUpdated({ id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// POST item image
router.post('/items/:id/image', managers, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const uploadDir = path.join(__dirname, '../../../../uploads/menu');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${id}.webp`;
    const filepath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    const imageUrl = `/uploads/menu/${filename}`;
    const item = await prisma.menuItem.update({
      where: { id },
      data: { imageUrl }
    });

    emitMenuUpdated(item);
    res.json(item);
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;
