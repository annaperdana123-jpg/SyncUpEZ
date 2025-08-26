const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Data Isolation Middleware
 * Ensures operations are scoped to tenant-specific directories
 */
function ensureDataIsolation(req, res, next) {
  try {
    // Get tenant ID from request (set by tenant middleware)
    const tenantId = req.tenantId || 'default';
    
    // Set the data path for this tenant
    req.dataPath = path.join(__dirname, `../../data/${tenantId}`);
    
    // Ensure tenant directory exists
    if (!fs.existsSync(req.dataPath)) {
      logger.info('Creating directory for new tenant', { tenantId, dataPath: req.dataPath });
      fs.mkdirSync(req.dataPath, { recursive: true });
      
      // Initialize empty CSV files for the tenant
      initializeTenantDataFiles(req.dataPath);
    }
    
    logger.debug('Data isolation configured', { tenantId, dataPath: req.dataPath });
    next();
  } catch (error) {
    logger.error('Error configuring data isolation', { 
      error: error.message, 
      stack: error.stack,
      operation: 'ensureDataIsolation',
      tenantId: req.tenantId
    });
    res.status(500).json({ error: 'Data isolation configuration failed' });
  }
}

/**
 * Initialize empty CSV files for a new tenant
 * @param {string} dataPath - Path to the tenant's data directory
 */
function initializeTenantDataFiles(dataPath) {
  const filesToCreate = [
    'employees.csv',
    'interactions.csv',
    'kudos.csv',
    'contributions.csv'
  ];
  
  filesToCreate.forEach(fileName => {
    const filePath = path.join(dataPath, fileName);
    if (!fs.existsSync(filePath)) {
      // Create an empty file
      fs.writeFileSync(filePath, '');
      logger.debug('Created empty data file for tenant', { filePath });
    }
  });
}

module.exports = { ensureDataIsolation };