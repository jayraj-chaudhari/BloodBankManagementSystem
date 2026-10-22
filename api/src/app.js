const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const healthRoutes = require('./routes/health.routes');

const app = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// API v1 Routes
app.use('/api/v1', healthRoutes);

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
