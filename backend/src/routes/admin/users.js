const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const ownerOnly = authMiddleware.requireRole('OWNER');

router.get('/', ownerOnly, async (req, res) => {
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, role: true, isActive: true, createdAt: true }
  });
  res.json(users);
});

router.post('/', ownerOnly, async (req, res) => {
  try {
    const { username, password, role = 'WAITER', isActive = true } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.adminUser.create({
      data: { username, passwordHash, role, isActive },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/:id', ownerOnly, async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.adminUser.update({
      where: { id: req.params.id },
      data,
      select: { id: true, username: true, role: true, isActive: true, createdAt: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
