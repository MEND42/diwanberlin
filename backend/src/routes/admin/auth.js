const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authMiddleware = require('../../middleware/auth');
const { sendEmail } = require('../../services/email');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

    res.json({ token, id: user.id, username: user.username, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load session' });
  }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await prisma.adminUser.findUnique({ where: { id: req.user.id } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword || '', user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const identifier = String(req.body.identifier || '').trim().toLowerCase();
    if (!identifier) return res.json({ success: true });

    const user = await prisma.adminUser.findFirst({
      where: {
        isActive: true,
        OR: [
          { username: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      include: { staffProfile: true },
    });

    const to = user?.email || user?.staffProfile?.email;
    if (!user || !to) return res.json({ success: true });

    const rawToken = crypto.randomBytes(32).toString('base64url');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const base = process.env.PUBLIC_BASE_URL || 'https://diwanberlin.com';
    const resetUrl = `${base.replace(/\/$/, '')}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;
    await sendEmail({
      to,
      subject: 'Passwort zurücksetzen · Cafe Diwan Admin',
      html: `
        <div style="font-family:Arial,sans-serif;background:#180e04;color:#fff4df;padding:24px">
          <h1 style="color:#c8922a;margin:0 0 12px">Cafe Diwan Admin</h1>
          <p>Sie haben eine Passwort-Zurücksetzung angefordert.</p>
          <p>Dieser Link ist 15 Minuten gültig:</p>
          <p><a href="${resetUrl}" style="color:#c8922a">${resetUrl}</a></p>
          <p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: true });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid reset request' });
    }

    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
      return res.status(400).json({ error: 'Reset link is invalid or expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
