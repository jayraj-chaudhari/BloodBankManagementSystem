const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const branchRoutes = require('./routes/branch.routes');
const hospitalRoutes = require('./routes/hospital.routes');
const donorRoutes = require('./routes/donor.routes');
const donationRoutes = require('./routes/donation.routes');
const screeningRoutes = require('./routes/screening.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const unitRoutes = require('./routes/unit.routes');
const requestRoutes = require('./routes/request.routes');
const alertRoutes = require('./routes/alert.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const auditRoutes = require('./routes/audit.routes');
const exportRoutes = require('./routes/export.routes');

const app = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// API v1 Routes Mount
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);
app.use('/api/v1/donors', donorRoutes);
app.use('/api/v1/donations', donationRoutes);
app.use('/api/v1/screenings', screeningRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/units', unitRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1', alertRoutes); // handles /requests/:request_id/alerts and /alerts/me
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/export', exportRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;
