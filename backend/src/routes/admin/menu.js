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
const { randomUUID } = require('crypto');
const { ensureDefaultMenu, seedDefaultMenu } = require('../../utils/defaultMenu');

const upload = multer({ storage: multer.memoryStorage() });

function emitMenuUpdated(payload) {
  try {
    socketService.getIO().emit('menu:updated', payload);
  } catch (_) {}
}

function touchSitemap() {
  try {
    const sitemapPath = path.join(__dirname, '../../../../sitemap.xml');
    const today = new Date().toISOString().slice(0, 10);
    if (!fs.existsSync(sitemapPath)) return;
    const xml = fs.readFileSync(sitemapPath, 'utf8');
    const updated = xml.includes('<lastmod>')
      ? xml.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`)
      : xml.replace('</url>', `  <lastmod>${today}</lastmod>\n  </url>`);
    fs.writeFileSync(sitemapPath, updated);
  } catch (_) {
    // Sitemap updates are best-effort and must not block menu edits.
  }
}

function slugify(value) {
  return String(value || 'category')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
}

function itemInclude() {
  return {
    variants: {
      orderBy: { sortOrder: 'asc' },
    },
  };
}

function normalizeVariant(input, index) {
  const labelDe = String(input?.labelDe || input?.label || '').trim();
  const price = Number(input?.price);
  if (!labelDe || !Number.isFinite(price) || price < 0) return null;
  return {
    labelDe,
    labelFa: input?.labelFa ? String(input.labelFa).trim() : labelDe,
    labelEn: input?.labelEn ? String(input.labelEn).trim() : labelDe,
    price,
    sortOrder: Number.isFinite(Number(input?.sortOrder)) ? Number(input.sortOrder) : index + 1,
    isDefault: Boolean(input?.isDefault) || index === 0,
    isActive: input?.isActive !== false,
  };
}

async function replaceItemVariants(itemId, variants = []) {
  if (!Array.isArray(variants)) return [];
  const rows = variants.map(normalizeVariant).filter(Boolean);
  await prisma.menuItemVariant.deleteMany({ where: { menuItemId: itemId } });
  if (rows.length > 0) {
    await prisma.menuItemVariant.createMany({
      data: rows.map(row => ({ id: randomUUID(), ...row, menuItemId: itemId })),
    });
  }
  return prisma.menuItemVariant.findMany({
    where: { menuItemId: itemId },
    orderBy: { sortOrder: 'asc' },
  });
}

async function uniqueCategorySlug(base) {
  const clean = slugify(base);
  let candidate = clean;
  let suffix = 2;
  while (await prisma.menuCategory.findUnique({ where: { slug: candidate } })) {
    candidate = `${clean}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

// GET all categories and items (including inactive)
router.get('/', async (req, res) => {
  try {
    await ensureDefaultMenu(prisma);
    const categories = await prisma.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: itemInclude(),
        }
      }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    await ensureDefaultMenu(prisma);
    const categories = await prisma.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: itemInclude(),
        }
      }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu categories' });
  }
});

router.post('/seed-defaults', managers, async (req, res) => {
  try {
    const result = await seedDefaultMenu(prisma);
    touchSitemap();
    emitMenuUpdated({ seeded: true, ...result });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Default menu seed error:', error);
    res.status(500).json({ error: 'Failed to insert starter menu' });
  }
});

// POST new category
router.post('/categories', managers, async (req, res) => {
  try {
    const { nameDe, nameFa, nameEn, slug, sortOrder, isActive, parentId } = req.body;
    const safeNameDe = String(nameDe || '').trim();
    if (!safeNameDe) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const safeSlug = await uniqueCategorySlug(slug || safeNameDe);
    const category = await prisma.menuCategory.create({
      data: {
        nameDe: safeNameDe,
        nameFa: nameFa || safeNameDe,
        nameEn: nameEn || safeNameDe,
        slug: safeSlug,
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive !== false,
        parentId: parentId || null
      }
    });
    touchSitemap();
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
    touchSitemap();
    emitMenuUpdated(category);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.put('/categories/:id', managers, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.menuCategory.update({
      where: { id },
      data: req.body
    });
    touchSitemap();
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
    touchSitemap();
    emitMenuUpdated({ id, deleted: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// POST new item
router.post('/items', managers, async (req, res) => {
  try {
    const { variants, ...body } = req.body;
    const item = await prisma.menuItem.create({
      data: body,
      include: itemInclude(),
    });
    if (Array.isArray(variants)) {
      item.variants = await replaceItemVariants(item.id, variants);
    }
    touchSitemap();
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
    const { variants, ...body } = req.body;
    const item = await prisma.menuItem.update({
      where: { id },
      data: body,
      include: itemInclude(),
    });
    if (Array.isArray(variants)) {
      item.variants = await replaceItemVariants(id, variants);
    }
    touchSitemap();
    emitMenuUpdated(item);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.put('/items/:id', managers, async (req, res) => {
  try {
    const { id } = req.params;
    const { variants, ...body } = req.body;
    const item = await prisma.menuItem.update({
      where: { id },
      data: body,
      include: itemInclude(),
    });
    if (Array.isArray(variants)) {
      item.variants = await replaceItemVariants(id, variants);
    }
    touchSitemap();
    emitMenuUpdated(item);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.patch('/items/:id/availability', managers, async (req, res) => {
  try {
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { isAvailable: Boolean(req.body.isAvailable) },
      include: itemInclude(),
    });
    touchSitemap();
    emitMenuUpdated(item);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item availability' });
  }
});

router.put('/items/:id/variants', managers, async (req, res) => {
  try {
    const variants = await replaceItemVariants(req.params.id, req.body?.variants ?? []);
    touchSitemap();
    emitMenuUpdated({ id: req.params.id, variantsUpdated: true });
    res.json(variants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item variants' });
  }
});

// DELETE item
router.delete('/items/:id', managers, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    touchSitemap();
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

    touchSitemap();
    emitMenuUpdated(item);
    res.json(item);
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;
