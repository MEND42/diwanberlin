const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../services/socket');
const { sendEmail } = require('../services/email');
const pushService = require('../services/push');

// POST a new table reservation
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, date, time, guests, specialRequests } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();
    const parsedDate = new Date(date);
    const parsedGuests = parseInt(guests, 10);

    if (!normalizedName || !normalizedEmail || Number.isNaN(parsedDate.getTime()) || !time || !parsedGuests) {
      return res.status(400).json({ error: 'Name, E-Mail, Datum, Zeit und Gäste sind erforderlich.' });
    }
    
    // Check for duplicate: same email + same date + same time within last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingReservation = await prisma.tableReservation.findFirst({
      where: {
        email: normalizedEmail,
        date: parsedDate,
        time,
        createdAt: { gte: oneHourAgo }
      }
    });
    
    if (existingReservation) {
      return res.status(409).json({ error: 'Eine Reservierung mit diesen Daten existiert bereits. Bitte warten Sie oder kontaktieren Sie uns direkt.' });
    }
    
    // Create reservation
    const reservation = await prisma.tableReservation.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        phone,
        date: parsedDate,
        time,
        guests: parsedGuests,
        specialRequests,
      }
    });

    // Notify dashboard
    const io = socketService.getIO();
    io.emit('reservation:new', reservation);
    pushService.notifyRoles(['OWNER', 'MANAGER'], {
      title: 'Neue Reservierung',
      body: `${normalizedName} · ${date} ${time} · ${parsedGuests} Gäste`,
      url: '/admin-v2/management/reservations',
      type: 'reservation',
    });

    // Send email to owner
    await sendEmail({
      to: process.env.SMTP_USER, // send to the café
      subject: `Neue Reservierung: ${normalizedName} am ${date} um ${time}`,
      html: `
        <h2>Neue Tischreservierung</h2>
        <p><strong>Name:</strong> ${normalizedName}</p>
        <p><strong>Email:</strong> ${normalizedEmail}</p>
        <p><strong>Telefon:</strong> ${phone || 'Nicht angegeben'}</p>
        <p><strong>Datum & Zeit:</strong> ${date} um ${time}</p>
        <p><strong>Gäste:</strong> ${parsedGuests}</p>
        <p><strong>Wünsche:</strong> ${specialRequests || 'Keine'}</p>
      `
    });

    // Send confirmation email to customer
    await sendEmail({
      to: normalizedEmail,
      subject: `Ihre Reservierungsanfrage bei Cafe Diwan`,
      html: `
        <h2>Vielen Dank für Ihre Anfrage!</h2>
        <p>Hallo ${normalizedName},</p>
        <p>wir haben Ihre Reservierungsanfrage für den ${date} um ${time} für ${parsedGuests} Personen erhalten.</p>
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
