const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../../middleware/auth');

// POST admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await prisma.adminUser.findUnique({
      where: { username }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, id: user.id, username: user.username, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load session' });
  }
});

module.exports = router;
