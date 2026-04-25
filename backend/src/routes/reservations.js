const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../services/socket');
const { sendEmail } = require('../services/email');

// POST a new table reservation
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, date, time, guests, specialRequests } = req.body;
    
    // Create reservation
    const reservation = await prisma.tableReservation.create({
      data: {
        name,
        email,
        phone,
        date: new Date(date),
        time,
        guests: parseInt(guests),
        specialRequests,
      }
    });

    // Notify dashboard
    const io = socketService.getIO();
    io.emit('reservation:new', reservation);

    // Send email to owner
    await sendEmail({
      to: process.env.SMTP_USER, // send to the café
      subject: `Neue Reservierung: ${name} am ${date} um ${time}`,
      html: `
        <h2>Neue Tischreservierung</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${phone || 'Nicht angegeben'}</p>
        <p><strong>Datum & Zeit:</strong> ${date} um ${time}</p>
        <p><strong>Gäste:</strong> ${guests}</p>
        <p><strong>Wünsche:</strong> ${specialRequests || 'Keine'}</p>
      `
    });

    // Send confirmation email to customer
    await sendEmail({
      to: email,
      subject: `Ihre Reservierungsanfrage bei Cafe Diwan`,
      html: `
        <h2>Vielen Dank für Ihre Anfrage!</h2>
        <p>Hallo ${name},</p>
        <p>wir haben Ihre Reservierungsanfrage für den ${date} um ${time} für ${guests} Personen erhalten.</p>
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
