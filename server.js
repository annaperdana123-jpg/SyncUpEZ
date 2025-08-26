require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Import logging utility
const logger = require('./src/utils/logger');
const { requestLogger } = require('./src/middleware/loggingMiddleware');
const { errorHandler } = require('./src/middleware/errorHandler');

// Import backup service
const { scheduleBackups, stopScheduledBackups } = require('./src/services/backupService');

// Import new SaaS middleware
const { resolveTenant } = require('./src/middleware/tenantMiddleware');
const { ensureDataIsolation } = require('./src/middleware/dataIsolationMiddleware');

// Middleware
app.use(express.json());
app.use(requestLogger); // Add request logging middleware

// SaaS Middleware - Order is important
app.use(resolveTenant);        // First identify the tenant
app.use(ensureDataIsolation);  // Then ensure data isolation

// Import routes
const employeeRoutes = require('./src/routes/employeeRoutes');
const authRoutes = require('./src/routes/authRoutes');
const interactionRoutes = require('./src/routes/interactionRoutes');
const kudosRoutes = require('./src/routes/kudosRoutes');
const contributionRoutes = require('./src/routes/contributionRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const backupRoutes = require('./src/routes/backupRoutes');
const tenantRoutes = require('./src/routes/tenantRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

// Use routes
app.use('/api/employees', employeeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/kudos', kudosRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'SyncUpEZ Server Running', 
    version: '1.0.0',
    description: 'CSV-based implementation of SyncUp Continuous Contribution Graph',
    tenantId: req.tenantId || 'unknown'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    url: req.url,
    method: req.method,
    tenantId: req.tenantId
  });
  
  res.status(404).json({ error: 'Route not found' });
});

// Only start the server if this file is being run directly
if (require.main === module) {
  // Schedule automatic backups (every 60 minutes by default)
  scheduleBackups(60);
  
  const server = app.listen(PORT, () => {
    logger.info(`SyncUpEZ server is running on port ${PORT}`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down server gracefully');
    stopScheduledBackups();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    logger.info('Shutting down server gracefully');
    stopScheduledBackups();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

module.exports = app;