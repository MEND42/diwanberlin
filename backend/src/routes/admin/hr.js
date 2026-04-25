const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../../middleware/auth');
const socketService = require('../../services/socket');

const router = express.Router();
const prisma = new PrismaClient();
const managers = authMiddleware.requireRole('OWNER', 'MANAGER');

function weekStartDate(value) {
  const base = value ? new Date(value) : new Date();
  const date = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function emit(event, payload) {
  try {
    socketService.getIO().emit(event, payload);
  } catch (_) {}
}

router.get('/staff', managers, async (_req, res) => {
  const staff = await prisma.adminUser.findMany({
    where: { isActive: true },
    orderBy: { username: 'asc' },
    select: {
      id: true,
      username: true,
      role: true,
      staffProfile: true
    }
  });
  res.json(staff);
});

router.put('/staff/:adminUserId/profile', managers, async (req, res) => {
  const { adminUserId } = req.params;
  const data = {
    fullName: req.body.fullName || req.body.username || 'Mitarbeiter',
    phone: req.body.phone || null,
    email: req.body.email || null,
    position: req.body.position || null,
    notes: req.body.notes || null,
    isActive: req.body.isActive !== false
  };
  const profile = await prisma.staffProfile.upsert({
    where: { adminUserId },
    update: data,
    create: { adminUserId, ...data }
  });
  emit('staff:updated', profile);
  res.json(profile);
});

router.get('/availability', async (req, res) => {
  const weekStart = weekStartDate(req.query.weekStart);
  const where = { weekStart };
  if (!['OWNER', 'MANAGER'].includes(req.user.role)) where.adminUserId = req.user.id;
  const items = await prisma.staffAvailability.findMany({
    where,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: { adminUser: { select: { id: true, username: true, role: true, staffProfile: true } } }
  });
  res.json(items);
});

router.post('/availability', async (req, res) => {
  const adminUserId = ['OWNER', 'MANAGER'].includes(req.user.role) && req.body.adminUserId ? req.body.adminUserId : req.user.id;
  const item = await prisma.staffAvailability.create({
    data: {
      adminUserId,
      weekStart: weekStartDate(req.body.weekStart),
      dayOfWeek: Number(req.body.dayOfWeek),
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      note: req.body.note || null,
      status: ['OWNER', 'MANAGER'].includes(req.user.role) ? (req.body.status || 'APPROVED') : 'PENDING'
    }
  });
  emit('staff:availability-updated', item);
  res.status(201).json(item);
});

router.patch('/availability/:id', managers, async (req, res) => {
  const item = await prisma.staffAvailability.update({
    where: { id: req.params.id },
    data: req.body
  });
  emit('staff:availability-updated', item);
  res.json(item);
});

router.get('/shifts', async (req, res) => {
  const weekStart = weekStartDate(req.query.weekStart);
  const where = { weekStart };
  if (!['OWNER', 'MANAGER'].includes(req.user.role)) where.adminUserId = req.user.id;
  const shifts = await prisma.shiftAssignment.findMany({
    where,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: { adminUser: { select: { id: true, username: true, role: true, staffProfile: true } } }
  });
  res.json(shifts);
});

router.post('/shifts', managers, async (req, res) => {
  const shift = await prisma.shiftAssignment.create({
    data: {
      adminUserId: req.body.adminUserId,
      weekStart: weekStartDate(req.body.weekStart),
      dayOfWeek: Number(req.body.dayOfWeek),
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      note: req.body.note || null,
      status: req.body.status || 'APPROVED'
    }
  });
  emit('staff:shift-updated', shift);
  res.status(201).json(shift);
});

router.patch('/shifts/:id', managers, async (req, res) => {
  const data = { ...req.body };
  if (data.dayOfWeek !== undefined) data.dayOfWeek = Number(data.dayOfWeek);
  const shift = await prisma.shiftAssignment.update({ where: { id: req.params.id }, data });
  emit('staff:shift-updated', shift);
  res.json(shift);
});

router.delete('/shifts/:id', managers, async (req, res) => {
  await prisma.shiftAssignment.delete({ where: { id: req.params.id } });
  emit('staff:shift-updated', { id: req.params.id, deleted: true });
  res.json({ success: true });
});

router.get('/time-entries', async (req, res) => {
  const weekStart = weekStartDate(req.query.weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const where = { clockIn: { gte: weekStart, lt: weekEnd } };
  if (!['OWNER', 'MANAGER'].includes(req.user.role)) where.adminUserId = req.user.id;
  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: { clockIn: 'desc' },
    include: { adminUser: { select: { id: true, username: true, role: true, staffProfile: true } } }
  });
  res.json(entries);
});

router.post('/clock-in', async (req, res) => {
  const open = await prisma.timeEntry.findFirst({ where: { adminUserId: req.user.id, status: 'OPEN' } });
  if (open) return res.status(409).json({ error: 'Already clocked in' });
  const entry = await prisma.timeEntry.create({
    data: { adminUserId: req.user.id, clockIn: new Date(), note: req.body.note || null }
  });
  emit('staff:time-updated', entry);
  res.status(201).json(entry);
});

router.post('/clock-out/:id', async (req, res) => {
  const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
  if (!entry || (entry.adminUserId !== req.user.id && !['OWNER', 'MANAGER'].includes(req.user.role))) {
    return res.status(404).json({ error: 'Time entry not found' });
  }
  const updated = await prisma.timeEntry.update({
    where: { id: req.params.id },
    data: { clockOut: new Date(), breakMinutes: Number(req.body.breakMinutes || entry.breakMinutes || 0), status: 'SUBMITTED' }
  });
  emit('staff:time-updated', updated);
  res.json(updated);
});

router.patch('/time-entries/:id', managers, async (req, res) => {
  const updated = await prisma.timeEntry.update({ where: { id: req.params.id }, data: req.body });
  emit('staff:time-updated', updated);
  res.json(updated);
});

module.exports = router;
