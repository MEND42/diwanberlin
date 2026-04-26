const express = require('express');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const socketService = require('../services/socket');
const { sendEmail } = require('../services/email');
const pushService = require('../services/push');

const router = express.Router();
const prisma = new PrismaClient();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anmeldungen. Bitte versuchen Sie es später erneut.' },
});

async function registrationCount(eventListingId) {
  const rows = await prisma.eventRegistration.aggregate({
    where: { eventListingId, status: { not: 'CANCELLED' } },
    _sum: { guests: true },
  });
  return rows._sum.guests || 0;
}

router.post('/:id/register', registrationLimiter, async (req, res) => {
  try {
    const event = await prisma.eventListing.findFirst({
      where: { id: req.params.id, isPublished: true },
    });
    if (!event) return res.status(404).json({ error: 'Veranstaltung nicht gefunden' });
    if (!event.registrationOpen) return res.status(409).json({ error: 'Anmeldung ist derzeit geschlossen' });

    const guests = Math.max(1, Math.min(10, Number(req.body.guests || 1)));
    const usedSeats = await registrationCount(event.id);
    if (event.maxAttendees && usedSeats + guests > event.maxAttendees) {
      return res.status(409).json({ error: 'Ausgebucht. Bitte kontaktieren Sie uns direkt für die Warteliste.' });
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        eventListingId: event.id,
        name: String(req.body.name || '').trim().slice(0, 120),
        email: String(req.body.email || '').trim().slice(0, 180),
        phone: req.body.phone ? String(req.body.phone).trim().slice(0, 80) : null,
        guests,
        message: req.body.message ? String(req.body.message).trim().slice(0, 800) : null,
      },
    });

    if (!registration.name || !registration.email) {
      await prisma.eventRegistration.delete({ where: { id: registration.id } });
      return res.status(400).json({ error: 'Name und E-Mail sind erforderlich' });
    }

    const payload = {
      id: registration.id,
      eventListingId: event.id,
      eventTitle: event.titleDe,
      name: registration.name,
      email: registration.email,
      guests: registration.guests,
      createdAt: registration.createdAt,
    };

    try {
      socketService.getIO().emit('event:registration', payload);
    } catch (_) {}
    pushService.notifyRoles(['OWNER', 'MANAGER'], {
      title: 'Neue Event-Anmeldung',
      body: `${registration.name} · ${event.titleDe} · ${registration.guests} Personen`,
      url: '/admin-v2/management/event-listings',
      type: 'event',
    });

    try {
      await sendEmail({
        to: registration.email,
        subject: `Ihre Anmeldung: ${event.titleDe}`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#180e04;color:#fff4df;padding:24px">
            <h1 style="color:#c8922a;margin:0 0 12px">Cafe Diwan Berlin</h1>
            <p>Vielen Dank, ${registration.name}. Ihre Anmeldung für <strong>${event.titleDe}</strong> ist bei uns eingegangen.</p>
            <p><strong>Personen:</strong> ${registration.guests}</p>
            <p>Wir melden uns, falls wir noch Rückfragen haben.</p>
          </div>
        `,
      });
    } catch (_) {
      // Registration should still succeed if SMTP is temporarily unavailable.
    }

    res.status(201).json({
      confirmationNumber: registration.id.slice(0, 8).toUpperCase(),
      registration,
    });
  } catch (error) {
    res.status(500).json({ error: 'Anmeldung konnte nicht gespeichert werden' });
  }
});

module.exports = router;
