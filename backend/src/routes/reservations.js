const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../services/socket');
const { sendEmail } = require('../services/email');
const pushService = require('../services/push');

async function sendOptionalEmail(payload) {
  try {
    await sendEmail(payload);
  } catch (error) {
    console.error('Reservation email notification failed:', error.message);
  }
}

// POST a new table reservation
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, date, time, guests, specialRequests } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();
    const parsedDate = date ? new Date(date) : new Date();
    if (Number.isNaN(parsedDate.getTime())) parsedDate.setTime(Date.now());
    const parsedGuests = parseInt(guests, 10) || 1;

    if (!normalizedName || !normalizedEmail) {
      return res.status(400).json({ error: 'Name und E-Mail sind erforderlich.' });
    }
    
    // Check for duplicate: same email + same date + same time within last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingReservation = await prisma.tableReservation.findFirst({
      where: {
        email: normalizedEmail,
        createdAt: { gte: oneHourAgo },
        ...(date ? { date: parsedDate } : {}),
        ...(time ? { time } : {}),
      }
    });
    
    if (existingReservation) {
      return res.json({
        message: 'Reservation already received',
        duplicate: true,
        reservation: existingReservation,
      });
    }
    
    // Create reservation
    const reservation = await prisma.tableReservation.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        phone,
        date: parsedDate,
        time: time || 'Nicht angegeben',
        guests: parsedGuests,
        specialRequests,
      }
    });

    // Notify dashboard
    const io = socketService.getIO();
    io.emit('reservation:new', reservation);
    pushService.notifyRoles(['OWNER', 'MANAGER'], {
      title: 'Neue Reservierung',
      body: `${normalizedName} · ${date || 'Datum offen'} ${time || ''} · ${parsedGuests} Gäste`,
      url: '/admin-v2/management/reservations',
      type: 'reservation',
    });

    // Send email to owner
    await sendOptionalEmail({
      to: process.env.NOTIFY_EMAIL || process.env.SMTP_TO || process.env.SMTP_USER,
      subject: `Neue Reservierung: ${normalizedName}${date ? ` am ${date}` : ''}`,
      html: `
        <h2>Neue Tischreservierung</h2>
        <p><strong>Name:</strong> ${normalizedName}</p>
        <p><strong>Email:</strong> ${normalizedEmail}</p>
        <p><strong>Telefon:</strong> ${phone || 'Nicht angegeben'}</p>
        <p><strong>Datum & Zeit:</strong> ${date || 'Nicht angegeben'} ${time ? `um ${time}` : ''}</p>
        <p><strong>Gäste:</strong> ${parsedGuests}</p>
        <p><strong>Wünsche:</strong> ${specialRequests || 'Keine'}</p>
      `
    });

    // Send confirmation email to customer
    await sendOptionalEmail({
      to: normalizedEmail,
      subject: `Ihre Reservierungsanfrage bei Cafe Diwan`,
      html: `
        <h2>Vielen Dank für Ihre Anfrage!</h2>
        <p>Hallo ${normalizedName},</p>
        <p>wir haben Ihre Reservierungsanfrage erhalten.</p>
        <p>Falls Datum, Uhrzeit oder Personenzahl fehlen, klären wir diese Details direkt mit Ihnen.</p>
        <p>Wir werden uns in Kürze bei Ihnen melden, um die Reservierung zu bestätigen.</p>
        <br/>
        <p>Herzliche Grüße,<br/>Ihr Cafe Diwan Team</p>
      `
    });

    res.status(201).json({ message: 'Reservation created successfully', reservation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

module.exports = router;
