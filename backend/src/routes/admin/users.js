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
    select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true }
  });
  res.json(users);
});

router.post('/', ownerOnly, async (req, res) => {
  try {
    const { username, email, password, role = 'WAITER', isActive = true } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.adminUser.create({
      data: { username, email: email || null, passwordHash, role, isActive },
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

async function updateUser(id, body) {
  const { password, ...rest } = body;
  const data = {};
  if (rest.username !== undefined) data.username = rest.username;
  if (rest.email !== undefined) data.email = rest.email || null;
  if (rest.role !== undefined) data.role = rest.role;
  if (rest.isActive !== undefined) data.isActive = Boolean(rest.isActive);
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  return prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true }
  });
}

router.patch('/:id', ownerOnly, async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.put('/:id', ownerOnly, async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/:id/deactivate', ownerOnly, async (req, res) => {
  try {
    await prisma.adminUser.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

router.post('/:id/reset-password', ownerOnly, async (req, res) => {
  try {
    const tempPassword = `Diwan-${Math.random().toString(36).slice(2, 8)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.adminUser.update({
      where: { id: req.params.id },
      data: { passwordHash }
    });
    res.json({ tempPassword });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
