const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');

// GET all active categories and their active items (nested)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { sortOrder: 'asc' }
            }
          }
        },
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// GET /pdf to download generated menu PDF
router.get('/pdf', async (req, res) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } }
          }
        },
        items: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } }
      }
    });

    const doc = new PDFDocument({ margin: 50 });
    let filename = 'Cafe_Diwan_Speisekarte.pdf';
    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');
    
    doc.pipe(res);
    
    doc.fontSize(24).fillColor('#c8922a').text('Cafe Diwan', { align: 'center' });
    doc.fontSize(14).fillColor('#2a1d10').text('Speisekarte', { align: 'center' });
    doc.moveDown(2);

    categories.forEach(parent => {
      doc.fontSize(18).fillColor('#2a1d10').text(parent.nameDe, { underline: true });
      doc.moveDown(0.5);

      parent.items.forEach(item => {
        doc.fontSize(12).fillColor('#2a1d10').text(`${item.nameDe} - ${Number(item.price).toFixed(2)}€`);
        if (item.descriptionDe) doc.fontSize(10).fillColor('grey').text(item.descriptionDe);
        doc.moveDown(0.5);
      });

      parent.subcategories.forEach(sub => {
        if (sub.items.length > 0) {
          doc.fontSize(14).fillColor('#2a1d10').text(sub.nameDe);
          doc.moveDown(0.5);
          sub.items.forEach(item => {
            doc.fontSize(12).fillColor('#2a1d10').text(`${item.nameDe} - ${Number(item.price).toFixed(2)}€`);
            if (item.descriptionDe) doc.fontSize(10).fillColor('grey').text(item.descriptionDe);
            doc.moveDown(0.5);
          });
        }
      });
      doc.moveDown(1);
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
