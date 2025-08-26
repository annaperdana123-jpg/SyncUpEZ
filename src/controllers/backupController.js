const { 
  createTenantBackups,
  createAllBackups, 
  getBackupScheduleStatus 
} = require('../services/backupService');
const { 
  listBackups, 
  restoreFromBackup, 
  verifyBackupIntegrity 
} = require('../utils/backupUtils');
const logger = require('../utils/logger');
const path = require('path');

/**
 * Create manual backup for current tenant
 */
async function createBackup(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.info('Manual backup requested for tenant', { tenantId });
    
    const results = await createTenantBackups(tenantId);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    logger.info('Manual backup completed for tenant', { 
      tenantId, 
      successful, 
      failed 
    });
    
    res.status(200).json({
      message: 'Backup process completed',
      tenantId,
      successful,
      failed,
      details: results
    });
  } catch (error) {
    logger.error('Manual backup failed for tenant', { 
      error: error.message, 
      stack: error.stack,
      tenantId: req.tenantId
    });
    res.status(500).json({ 
      error: 'Backup process failed',
      message: error.message 
    });
  }
}

/**
 * Create manual backup for all tenants (admin only)
 */
async function createAllTenantsBackup(req, res) {
  try {
    logger.info('Manual backup requested for all tenants');
    
    const results = await createAllBackups();
    
    logger.info('Manual backup completed for all tenants');
    
    res.status(200).json({
      message: 'Backup process completed for all tenants',
      details: results
    });
  } catch (error) {
    logger.error('Manual backup failed for all tenants', { 
      error: error.message, 
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Backup process failed',
      message: error.message 
    });
  }
}

/**
 * List all backups
 */
async function listBackupFiles(req, res) {
  try {
    logger.debug('Listing backup files');
    
    const backups = await listBackups();
    
    logger.info('Backup files listed', { count: backups.length });
    
    res.status(200).json({
      message: 'Backup files retrieved successfully',
      count: backups.length,
      backups: backups
    });
  } catch (error) {
    logger.error('Failed to list backup files', { 
      error: error.message, 
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to list backup files',
      message: error.message 
    });
  }
}

/**
 * Restore from backup (tenant-aware)
 */
async function restoreBackup(req, res) {
  try {
    const { backupFileName, targetFileName } = req.body;
    const tenantId = req.tenantId || 'default';
    
    logger.info('Backup restoration requested', { 
      backupFileName, 
      targetFileName, 
      tenantId 
    });
    
    // Validate input
    if (!backupFileName) {
      logger.warn('Missing backup file name for restoration', { tenantId });
      return res.status(400).json({ 
        error: 'Missing backup file name',
        message: 'backupFileName is required'
      });
    }
    
    if (!targetFileName) {
      logger.warn('Missing target file name for restoration', { tenantId });
      return res.status(400).json({ 
        error: 'Missing target file name',
        message: 'targetFileName is required'
      });
    }
    
    // Construct file paths
    const backupFilePath = path.join(__dirname, '../../backups', backupFileName);
    const targetFilePath = path.join(__dirname, '../../data', tenantId, targetFileName);
    
    // Perform restoration
    await restoreFromBackup(backupFilePath, targetFilePath);
    
    logger.info('Backup restoration completed', { 
      backupFileName, 
      targetFileName, 
      tenantId 
    });
    
    res.status(200).json({
      message: 'Backup restored successfully',
      tenantId,
      backupFileName,
      targetFileName
    });
  } catch (error) {
    logger.error('Backup restoration failed', { 
      error: error.message, 
      stack: error.stack,
      tenantId: req.tenantId
    });
    res.status(500).json({ 
      error: 'Backup restoration failed',
      message: error.message 
    });
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(req, res) {
  try {
    const { backupFileName, expectedChecksum } = req.body;
    
    logger.info('Backup integrity verification requested', { backupFileName });
    
    // Validate input
    if (!backupFileName) {
      logger.warn('Missing backup file name for integrity verification');
      return res.status(400).json({ 
        error: 'Missing backup file name',
        message: 'backupFileName is required'
      });
    }
    
    if (!expectedChecksum) {
      logger.warn('Missing expected checksum for integrity verification');
      return res.status(400).json({ 
        error: 'Missing expected checksum',
        message: 'expectedChecksum is required'
      });
    }
    
    // Construct file path
    const backupFilePath = path.join(__dirname, '../../backups', backupFileName);
    
    // Verify integrity
    const isValid = await verifyBackupIntegrity(backupFilePath, expectedChecksum);
    
    logger.info('Backup integrity verification completed', { 
      backupFileName, 
      isValid 
    });
    
    res.status(200).json({
      message: 'Backup integrity verification completed',
      backupFileName,
      isValid
    });
  } catch (error) {
    logger.error('Backup integrity verification failed', { 
      error: error.message, 
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Backup integrity verification failed',
      message: error.message 
    });
  }
}

/**
 * Get backup schedule status
 */
async function getBackupStatus(req, res) {
  try {
    logger.debug('Backup schedule status requested');
    
    const status = getBackupScheduleStatus();
    
    logger.info('Backup schedule status retrieved');
    
    res.status(200).json({
      message: 'Backup schedule status retrieved',
      status: status
    });
  } catch (error) {
    logger.error('Failed to get backup schedule status', { 
      error: error.message, 
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to get backup schedule status',
      message: error.message 
    });
  }
}

module.exports = {
  createBackup,
  createAllTenantsBackup,
  listBackupFiles,
  restoreBackup,
  verifyBackup,
  getBackupStatus
};