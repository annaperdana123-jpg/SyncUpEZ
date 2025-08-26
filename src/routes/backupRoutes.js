const express = require('express');
const router = express.Router();
const { 
  createBackup,
  createAllTenantsBackup,
  listBackupFiles,
  restoreBackup,
  verifyBackup,
  getBackupStatus
} = require('../controllers/backupController');

// Create manual backup for current tenant
router.post('/create', createBackup);

// Create manual backup for all tenants (admin only)
router.post('/create-all', createAllTenantsBackup);

// List all backups
router.get('/list', listBackupFiles);

// Restore from backup
router.post('/restore', restoreBackup);

// Verify backup integrity
router.post('/verify', verifyBackup);

// Get backup schedule status
router.get('/status', getBackupStatus);

module.exports = router;