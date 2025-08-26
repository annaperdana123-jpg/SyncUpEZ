const { createBackup, cleanupOldBackups } = require('../utils/backupUtils');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Store backup schedule reference
let backupSchedule = null;

/**
 * Create backups for all CSV files for a specific tenant
 * @param {string} tenantId - Tenant identifier
 * @returns {Array} - Backup results
 */
async function createTenantBackups(tenantId) {
  try {
    logger.info('Starting backup process for tenant CSV files', { tenantId });
    
    // Define the CSV files to backup for this tenant
    const tenantDataPath = path.join(__dirname, `../../data/${tenantId}`);
    const CSV_FILES = [
      { path: path.join(tenantDataPath, 'employees.csv'), name: 'employees.csv' },
      { path: path.join(tenantDataPath, 'interactions.csv'), name: 'interactions.csv' },
      { path: path.join(tenantDataPath, 'kudos.csv'), name: 'kudos.csv' },
      { path: path.join(tenantDataPath, 'contributions.csv'), name: 'contributions.csv' }
    ];
    
    const results = [];
    
    // Create backup for each CSV file
    for (const file of CSV_FILES) {
      try {
        const backupInfo = await createBackup(file.path);
        results.push({ file: file.name, success: true, backupInfo });
        logger.debug('Backup created for file', { fileName: file.name, tenantId });
      } catch (error) {
        results.push({ file: file.name, success: false, error: error.message });
        logger.error('Failed to create backup for file', { 
          fileName: file.name, 
          error: error.message,
          tenantId
        });
      }
    }
    
    // Cleanup old backups
    try {
      const deletedCount = await cleanupOldBackups(7); // Keep backups for 7 days
      logger.info('Old backups cleaned up', { deletedCount, tenantId });
    } catch (error) {
      logger.error('Failed to cleanup old backups', { error: error.message, tenantId });
    }
    
    logger.info('Backup process completed for tenant', { 
      tenantId,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
    return results;
  } catch (error) {
    logger.error('Backup process failed for tenant', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    throw new Error(`Backup process failed for tenant ${tenantId}: ${error.message}`);
  }
}

/**
 * Create backups for all tenants
 * @returns {Object} - Backup results for all tenants
 */
async function createAllBackups() {
  try {
    logger.info('Starting backup process for all tenants');
    
    // Get all tenant directories
    const dataPath = path.join(__dirname, '../../data');
    const items = fs.readdirSync(dataPath);
    
    // Filter out only directories that represent tenants
    const tenants = items.filter(item => {
      const itemPath = path.join(dataPath, item);
      return fs.statSync(itemPath).isDirectory() && 
             fs.existsSync(path.join(itemPath, 'tenant.json')); // Must have metadata file
    });
    
    const allResults = {};
    
    // Create backups for each tenant
    for (const tenantId of tenants) {
      try {
        const tenantResults = await createTenantBackups(tenantId);
        allResults[tenantId] = tenantResults;
      } catch (error) {
        logger.error('Failed to create backups for tenant', { 
          tenantId, 
          error: error.message 
        });
        allResults[tenantId] = { error: error.message };
      }
    }
    
    logger.info('Backup process completed for all tenants', { 
      tenantCount: tenants.length
    });
    
    return allResults;
  } catch (error) {
    logger.error('Backup process failed for all tenants', { 
      error: error.message, 
      stack: error.stack
    });
    throw new Error(`Backup process failed for all tenants: ${error.message}`);
  }
}

/**
 * Schedule automatic backups
 * @param {number} intervalInMinutes - Backup interval in minutes (default: 60)
 */
function scheduleBackups(intervalInMinutes = 60) {
  // Clear existing schedule if any
  if (backupSchedule) {
    clearInterval(backupSchedule);
    logger.info('Previous backup schedule cleared');
  }
  
  // Convert minutes to milliseconds
  const intervalInMillis = intervalInMinutes * 60 * 1000;
  
  logger.info('Scheduling automatic backups', { intervalInMinutes });
  
  // Schedule backups
  backupSchedule = setInterval(async () => {
    try {
      await createAllBackups();
    } catch (error) {
      logger.error('Scheduled backup failed', { error: error.message });
    }
  }, intervalInMillis);
  
  // Run initial backup
  setImmediate(async () => {
    try {
      await createAllBackups();
    } catch (error) {
      logger.error('Initial backup failed', { error: error.message });
    }
  });
  
  logger.info('Automatic backups scheduled successfully');
}

/**
 * Stop scheduled backups
 */
function stopScheduledBackups() {
  if (backupSchedule) {
    clearInterval(backupSchedule);
    backupSchedule = null;
    logger.info('Scheduled backups stopped');
  }
}

/**
 * Get backup schedule status
 * @returns {Object} - Schedule status
 */
function getBackupScheduleStatus() {
  return {
    scheduled: !!backupSchedule
  };
}

module.exports = {
  createTenantBackups,
  createAllBackups,
  scheduleBackups,
  stopScheduledBackups,
  getBackupScheduleStatus
};