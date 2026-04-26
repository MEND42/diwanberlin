const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

function normalizeCustomer(data) {
  return {
    ...data,
    email: data.email || null,
    phone: data.phone || null,
    points: data.points === undefined || data.points === '' ? undefined : Number(data.points),
  };
}

router.get('/', async (req, res) => {
  const customers = await prisma.customer.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json(customers);
});

router.post('/', async (req, res) => {
  try {
    const customer = await prisma.customer.create({ data: normalizeCustomer(req.body) });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: normalizeCustomer(req.body) });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: normalizeCustomer(req.body) });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.post('/:id/points', async (req, res) => {
  try {
    const delta = Number(req.body.points || 0);
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { points: { increment: delta } }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update points' });
  }
});

module.exports = router;
