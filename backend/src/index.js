require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const rateLimit = require('express-rate-limit');
const socketService = require('./services/socket');
const authMiddleware = require('./middleware/auth');

// Rate limiters for public forms
const reservationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const eventLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
  standardHeaders: true,
  legacyHeaders: false,
});


// Import routes
const menuRoutes = require('./routes/menu');
const reservationsRoutes = require('./routes/reservations');
const eventsRoutes = require('./routes/events');
const eventListingsRoutes = require('./routes/eventListings');
const siteContentRoutes = require('./routes/siteContent');
const publicTableRoutes = require('./routes/publicTable');
const publicEventsRoutes = require('./routes/publicEvents');

const adminAuthRoutes = require('./routes/admin/auth');
const adminMenuRoutes = require('./routes/admin/menu');
const adminTablesRoutes = require('./routes/admin/tables');
const adminOrdersRoutes = require('./routes/admin/orders');
const adminReservationsRoutes = require('./routes/admin/reservations');
const adminEventsRoutes = require('./routes/admin/events');
const adminEventListingsRoutes = require('./routes/admin/eventListings');
const adminUsersRoutes = require('./routes/admin/users');
const adminCustomersRoutes = require('./routes/admin/customers');
const adminDiscountsRoutes = require('./routes/admin/discounts');
const adminHrRoutes = require('./routes/admin/hr');
const adminSiteContentRoutes = require('./routes/admin/siteContent');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminPushRoutes = require('./routes/admin/push');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

// CORS — allow diwanberlin.com in production, all origins in dev
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://diwanberlin.com', 'https://www.diwanberlin.com']
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Health check — used by Docker HEALTHCHECK and deploy.sh
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cafe-diwan-api', ts: new Date().toISOString() });
});

// Public Routes
app.use('/api/menu', menuRoutes);
app.use('/api/reservations', reservationLimiter, reservationsRoutes);
app.use('/api/events', eventLimiter, eventsRoutes);
app.use('/api/event-listings', eventListingsRoutes);
app.use('/api/site-content', siteContentRoutes);
app.use('/api/public', publicTableRoutes);
app.use('/api/public/events', publicEventsRoutes);


// Admin Routes (Auth)
app.use('/api/admin', adminAuthRoutes);

// Admin Routes (Protected)
app.use('/api/admin/menu', authMiddleware, adminMenuRoutes);
app.use('/api/admin/tables', authMiddleware, adminTablesRoutes);
app.use('/api/admin/orders', authMiddleware, adminOrdersRoutes);
app.use('/api/admin/reservations', authMiddleware, adminReservationsRoutes);
app.use('/api/admin/events', authMiddleware, adminEventsRoutes);
app.use('/api/admin/event-listings', authMiddleware, adminEventListingsRoutes);
app.use('/api/admin/users', authMiddleware, adminUsersRoutes);
app.use('/api/admin/customers', authMiddleware, adminCustomersRoutes);
app.use('/api/admin/discounts', authMiddleware, adminDiscountsRoutes);
app.use('/api/admin/hr', authMiddleware, adminHrRoutes);
app.use('/api/admin/site-content', authMiddleware, adminSiteContentRoutes);
app.use('/api/admin/dashboard', authMiddleware, adminDashboardRoutes);
app.use('/api/admin/push', authMiddleware, adminPushRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
