const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

// Create backups directory if it doesn't exist
const backupsDir = path.join(__dirname, '../../backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

/**
 * Create a backup of a file
 * @param {string} sourceFilePath - Path to the source file
 * @param {string} backupName - Name for the backup file (optional)
 * @returns {Object} - Backup information
 */
async function createBackup(sourceFilePath, backupName = null) {
  try {
    logger.debug('Creating backup', { sourceFilePath, backupName });
    
    // Check if source file exists
    if (!fs.existsSync(sourceFilePath)) {
      logger.warn('Source file does not exist for backup', { sourceFilePath });
      throw new Error(`Source file does not exist: ${sourceFilePath}`);
    }
    
    // Generate backup filename if not provided
    const fileName = path.basename(sourceFilePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = backupName || `${fileName}.backup-${timestamp}`;
    const backupFilePath = path.join(backupsDir, backupFileName);
    
    // Copy the file
    fs.copyFileSync(sourceFilePath, backupFilePath);
    
    // Calculate checksum for integrity verification
    const checksum = calculateFileChecksum(backupFilePath);
    
    // Get file stats
    const stats = fs.statSync(backupFilePath);
    
    const backupInfo = {
      sourceFile: sourceFilePath,
      backupFile: backupFilePath,
      fileName: backupFileName,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      checksum: checksum
    };
    
    logger.info('Backup created successfully', { 
      sourceFilePath, 
      backupFilePath,
      size: stats.size
    });
    
    return backupInfo;
  } catch (error) {
    logger.error('Failed to create backup', { 
      error: error.message, 
      stack: error.stack,
      sourceFilePath,
      backupName
    });
    throw new Error(`Failed to create backup: ${error.message}`);
  }
}

/**
 * Restore a file from backup
 * @param {string} backupFilePath - Path to the backup file
 * @param {string} targetFilePath - Path where to restore the file
 * @returns {boolean} - Success status
 */
async function restoreFromBackup(backupFilePath, targetFilePath) {
  try {
    logger.debug('Restoring from backup', { backupFilePath, targetFilePath });
    
    // Check if backup file exists
    if (!fs.existsSync(backupFilePath)) {
      logger.warn('Backup file does not exist for restoration', { backupFilePath });
      throw new Error(`Backup file does not exist: ${backupFilePath}`);
    }
    
    // Copy the backup file to target location
    fs.copyFileSync(backupFilePath, targetFilePath);
    
    logger.info('File restored successfully', { 
      backupFilePath, 
      targetFilePath
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to restore from backup', { 
      error: error.message, 
      stack: error.stack,
      backupFilePath,
      targetFilePath
    });
    throw new Error(`Failed to restore from backup: ${error.message}`);
  }
}

/**
 * List all available backups
 * @returns {Array} - List of backup files with metadata
 */
async function listBackups() {
  try {
    logger.debug('Listing backups');
    
    // Read backup directory
    const files = fs.readdirSync(backupsDir);
    
    // Get metadata for each backup file
    const backups = files.map(file => {
      try {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          fileName: file,
          filePath: filePath,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        };
      } catch (error) {
        logger.warn('Failed to get metadata for backup file', { 
          file, 
          error: error.message 
        });
        return null;
      }
    }).filter(backup => backup !== null);
    
    logger.info('Backups listed successfully', { count: backups.length });
    return backups;
  } catch (error) {
    logger.error('Failed to list backups', { 
      error: error.message, 
      stack: error.stack
    });
    throw new Error(`Failed to list backups: ${error.message}`);
  }
}

/**
 * Delete old backups based on retention policy
 * @param {number} maxAgeInDays - Maximum age of backups in days (default: 7)
 * @returns {number} - Number of deleted backups
 */
async function cleanupOldBackups(maxAgeInDays = 7) {
  try {
    logger.debug('Cleaning up old backups', { maxAgeInDays });
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
    
    const files = fs.readdirSync(backupsDir);
    let deletedCount = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        
        // Check if file is older than cutoff date
        if (stats.birthtime < cutoffDate) {
          fs.unlinkSync(filePath);
          logger.info('Deleted old backup', { filePath });
          deletedCount++;
        }
      } catch (error) {
        logger.warn('Failed to delete backup file', { 
          file, 
          error: error.message 
        });
      }
    }
    
    logger.info('Old backups cleaned up', { deletedCount, maxAgeInDays });
    return deletedCount;
  } catch (error) {
    logger.error('Failed to clean up old backups', { 
      error: error.message, 
      stack: error.stack,
      maxAgeInDays
    });
    throw new Error(`Failed to clean up old backups: ${error.message}`);
  }
}

/**
 * Calculate checksum of a file for integrity verification
 * @param {string} filePath - Path to the file
 * @returns {string} - MD5 checksum
 */
function calculateFileChecksum(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    logger.error('Failed to calculate file checksum', { 
      error: error.message, 
      filePath
    });
    throw new Error(`Failed to calculate file checksum: ${error.message}`);
  }
}

/**
 * Verify backup integrity using checksum
 * @param {string} backupFilePath - Path to the backup file
 * @param {string} expectedChecksum - Expected checksum
 * @returns {boolean} - Integrity verification result
 */
async function verifyBackupIntegrity(backupFilePath, expectedChecksum) {
  try {
    logger.debug('Verifying backup integrity', { backupFilePath });
    
    // Check if backup file exists
    if (!fs.existsSync(backupFilePath)) {
      logger.warn('Backup file does not exist for integrity verification', { backupFilePath });
      return false;
    }
    
    // Calculate actual checksum
    const actualChecksum = calculateFileChecksum(backupFilePath);
    
    // Compare checksums
    const isValid = actualChecksum === expectedChecksum;
    
    if (isValid) {
      logger.info('Backup integrity verified', { backupFilePath });
    } else {
      logger.warn('Backup integrity verification failed', { 
        backupFilePath,
        expectedChecksum,
        actualChecksum
      });
    }
    
    return isValid;
  } catch (error) {
    logger.error('Failed to verify backup integrity', { 
      error: error.message, 
      stack: error.stack,
      backupFilePath
    });
    throw new Error(`Failed to verify backup integrity: ${error.message}`);
  }
}

module.exports = {
  createBackup,
  restoreFromBackup,
  listBackups,
  cleanupOldBackups,
  calculateFileChecksum,
  verifyBackupIntegrity
};