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
    console.error('Event email notification failed:', error.message);
  }
}

// POST a new event inquiry
router.post('/', async (req, res) => {
  try {
    const { 
      name, email, phone, eventDate, eventTiming, numberOfPeople, eventType,
      drinks, cakes, food, equipment, decor, otherNotes 
    } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();
    const parsedDate = eventDate ? new Date(eventDate) : new Date();
    if (Number.isNaN(parsedDate.getTime())) parsedDate.setTime(Date.now());
    const parsedPeople = parseInt(numberOfPeople, 10) || 1;
    const safeEventType = eventType || 'Sonstiges';
    const safeEventTiming = eventTiming || 'Nicht angegeben';

    if (!normalizedName || !normalizedEmail) {
      return res.status(400).json({ error: 'Name und E-Mail sind erforderlich.' });
    }
    
    // Check for duplicate: same email + same event date within last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingEvent = await prisma.eventInquiry.findFirst({
      where: {
        email: normalizedEmail,
        createdAt: { gte: oneHourAgo },
        ...(eventDate ? { eventDate: parsedDate } : {}),
      }
    });
    
    if (existingEvent) {
      return res.json({
        message: 'Event inquiry already received',
        duplicate: true,
        event: existingEvent,
      });
    }
    
    // Create event inquiry
    const event = await prisma.eventInquiry.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        phone: phone || '',
        eventDate: parsedDate,
        eventTiming: safeEventTiming,
        numberOfPeople: parsedPeople,
        eventType: safeEventType,
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
      body: `${normalizedName} · ${safeEventType} · ${parsedPeople} Gäste`,
      url: '/admin-v2/management/events',
      type: 'event',
    });

    // Send email to owner
    await sendOptionalEmail({
      to: process.env.NOTIFY_EMAIL || process.env.SMTP_TO || process.env.SMTP_USER,
      subject: `Neue Event-Anfrage: ${safeEventType}${eventDate ? ` am ${eventDate}` : ''}`,
      html: `
        <h2>Neue Event-Anfrage</h2>
        <p><strong>Typ:</strong> ${safeEventType}</p>
        <p><strong>Name:</strong> ${normalizedName}</p>
        <p><strong>Email:</strong> ${normalizedEmail}</p>
        <p><strong>Telefon:</strong> ${phone || 'Nicht angegeben'}</p>
        <p><strong>Datum & Zeit:</strong> ${eventDate || 'Nicht angegeben'} (${safeEventTiming})</p>
        <p><strong>Gäste:</strong> ${parsedPeople}</p>
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
    await sendOptionalEmail({
      to: normalizedEmail,
      subject: `Ihre Event-Anfrage bei Cafe Diwan`,
      html: `
        <h2>Vielen Dank für Ihre Anfrage!</h2>
        <p>Hallo ${normalizedName},</p>
        <p>wir haben Ihre Event-Anfrage erhalten.</p>
        <p>Falls Datum, Uhrzeit oder Personenzahl fehlen, klären wir diese Details direkt mit Ihnen.</p>
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
