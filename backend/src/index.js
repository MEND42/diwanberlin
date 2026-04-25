require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketService = require('./services/socket');
const authMiddleware = require('./middleware/auth');

// Import routes
const menuRoutes = require('./routes/menu');
const reservationsRoutes = require('./routes/reservations');
const eventsRoutes = require('./routes/events');

const adminAuthRoutes = require('./routes/admin/auth');
const adminMenuRoutes = require('./routes/admin/menu');
const adminTablesRoutes = require('./routes/admin/tables');
const adminOrdersRoutes = require('./routes/admin/orders');
const adminReservationsRoutes = require('./routes/admin/reservations');
const adminEventsRoutes = require('./routes/admin/events');

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
app.use('/api/reservations', reservationsRoutes);
app.use('/api/events', eventsRoutes);

// Admin Routes (Auth)
app.use('/api/admin', adminAuthRoutes);

// Admin Routes (Protected)
app.use('/api/admin/menu', authMiddleware, adminMenuRoutes);
app.use('/api/admin/tables', authMiddleware, adminTablesRoutes);
app.use('/api/admin/orders', authMiddleware, adminOrdersRoutes);
app.use('/api/admin/reservations', authMiddleware, adminReservationsRoutes);
app.use('/api/admin/events', authMiddleware, adminEventsRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
