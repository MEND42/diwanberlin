const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const socketService = require('../services/socket');
const { sendEmail } = require('../services/email');
const pushService = require('../services/push');

// POST a new event inquiry
router.post('/', async (req, res) => {
  try {
    const { 
      name, email, phone, eventDate, eventTiming, numberOfPeople, eventType,
      drinks, cakes, food, equipment, decor, otherNotes 
    } = req.body;
    
    // Check for duplicate: same email + same event date within last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingEvent = await prisma.eventInquiry.findFirst({
      where: {
        email: email.toLowerCase(),
        eventDate: new Date(eventDate),
        createdAt: { gte: oneHourAgo }
      }
    });
    
    if (existingEvent) {
      return res.status(409).json({ error: 'Eine Anfrage mit diesen Daten existiert bereits. Bitte warten Sie oder kontaktieren Sie uns direkt.' });
    }
    
    // Create event inquiry
    const event = await prisma.eventInquiry.create({
      data: {
        name,
        email,
        phone,
        eventDate: new Date(eventDate),
        eventTiming,
        numberOfPeople: parseInt(numberOfPeople),
        eventType,
        drinks,
        cakes,
        food,
        equipment,
        decor,
        otherNotes
      }
    });

    // Notify dashboard
    const io = socketService.getIO();
    io.emit('event:new', event);
    pushService.notifyRoles(['OWNER', 'MANAGER'], {
      title: 'Neue Event-Anfrage',
      body: `${name} · ${eventType} · ${numberOfPeople} Gäste`,
      url: '/admin-v2/management/events',
      type: 'event',
    });

    // Send email to owner
    await sendEmail({
      to: process.env.SMTP_USER,
      subject: `Neue Event-Anfrage: ${eventType} am ${eventDate}`,
      html: `
        <h2>Neue Event-Anfrage</h2>
        <p><strong>Typ:</strong> ${eventType}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${phone}</p>
        <p><strong>Datum & Zeit:</strong> ${eventDate} (${eventTiming})</p>
        <p><strong>Gäste:</strong> ${numberOfPeople}</p>
        <hr/>
        <h3>Anforderungen:</h3>
        <p><strong>Getränke:</strong> ${drinks || '-'}</p>
        <p><strong>Kuchen:</strong> ${cakes || '-'}</p>
        <p><strong>Speisen:</strong> ${food || '-'}</p>
        <p><strong>Ausstattung:</strong> ${equipment || '-'}</p>
        <p><strong>Deko:</strong> ${decor || '-'}</p>
        <p><strong>Sonstiges:</strong> ${otherNotes || '-'}</p>
      `
    });

    // Send confirmation email to customer
    await sendEmail({
      to: email,
      subject: `Ihre Event-Anfrage bei Cafe Diwan`,
      html: `
        <h2>Vielen Dank für Ihre Anfrage!</h2>
        <p>Hallo ${name},</p>
        <p>wir haben Ihre Event-Anfrage für den ${eventDate} erhalten.</p>
        <p>Unser Team wird Ihre Anfrage prüfen und sich schnellstmöglich mit Ihnen in Verbindung setzen, um die Details zu besprechen und Ihnen ein Angebot zu erstellen.</p>
        <br/>
        <p>Herzliche Grüße,<br/>Ihr Cafe Diwan Team</p>
      `
    });

    res.status(201).json({ message: 'Event inquiry created successfully', event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create event inquiry' });
  }
});

module.exports = router;
