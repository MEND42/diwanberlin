const express = require('express');
const { PrismaClient } = require('@prisma/client');
const pushService = require('../../services/push');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/public-key', (_req, res) => {
  res.json({ publicKey: pushService.publicKey() });
});

router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }

    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: req.user.id,
        p256dh,
        auth,
      },
      create: {
        userId: req.user.id,
        endpoint,
        p256dh,
        auth,
      },
    });

    res.status(201).json({ id: saved.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

router.delete('/subscribe', async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: req.user.id, endpoint },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { userId: req.user.id },
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

module.exports = router;
