const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Tenant Management Service
 * Handles tenant provisioning, management, and lifecycle operations
 */

/**
 * Provision a new tenant
 * @param {string} tenantId - Unique identifier for the tenant
 * @param {Object} tenantData - Additional tenant data (name, contact, etc.)
 * @returns {Promise<Object>} - Result of provisioning operation
 */
async function provisionTenant(tenantId, tenantData = {}) {
  try {
    logger.info('Provisioning new tenant', { tenantId, tenantData });
    
    // Validate tenant ID
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new Error('Invalid tenant ID');
    }
    
    // Create tenant directory
    const tenantDataPath = path.join(__dirname, `../../data/${tenantId}`);
    
    if (fs.existsSync(tenantDataPath)) {
      logger.warn('Tenant directory already exists', { tenantId, tenantDataPath });
      throw new Error(`Tenant ${tenantId} already exists`);
    }
    
    // Create directory structure
    fs.mkdirSync(tenantDataPath, { recursive: true });
    
    // Initialize empty CSV files for the tenant
    initializeTenantDataFiles(tenantDataPath);
    
    // Create tenant metadata file
    const tenantMetadata = {
      tenantId,
      createdAt: new Date().toISOString(),
      ...tenantData
    };
    
    const metadataPath = path.join(tenantDataPath, 'tenant.json');
    fs.writeFileSync(metadataPath, JSON.stringify(tenantMetadata, null, 2));
    
    logger.info('Tenant provisioned successfully', { tenantId, tenantDataPath });
    
    return {
      success: true,
      tenantId,
      message: 'Tenant provisioned successfully'
    };
  } catch (error) {
    logger.error('Failed to provision tenant', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    
    throw new Error(`Failed to provision tenant ${tenantId}: ${error.message}`);
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

/**
 * Get tenant information
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} - Tenant information
 */
async function getTenantInfo(tenantId) {
  try {
    const tenantDataPath = path.join(__dirname, `../../data/${tenantId}`);
    
    if (!fs.existsSync(tenantDataPath)) {
      throw new Error(`Tenant ${tenantId} does not exist`);
    }
    
    // Read tenant metadata
    const metadataPath = path.join(tenantDataPath, 'tenant.json');
    let tenantInfo = {
      tenantId,
      createdAt: null
    };
    
    if (fs.existsSync(metadataPath)) {
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      tenantInfo = { ...tenantInfo, ...JSON.parse(metadataContent) };
    }
    
    return tenantInfo;
  } catch (error) {
    logger.error('Failed to get tenant info', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    
    throw new Error(`Failed to get tenant info for ${tenantId}: ${error.message}`);
  }
}

/**
 * List all tenants
 * @returns {Promise<Array>} - List of tenant IDs
 */
async function listTenants() {
  try {
    const dataPath = path.join(__dirname, '../../data');
    const items = fs.readdirSync(dataPath);
    
    // Filter out only directories that represent tenants
    const tenants = items.filter(item => {
      const itemPath = path.join(dataPath, item);
      return fs.statSync(itemPath).isDirectory() && 
             item !== 'default' && // Exclude default directory if it exists
             fs.existsSync(path.join(itemPath, 'tenant.json')); // Must have metadata file
    });
    
    logger.debug('Listed tenants', { count: tenants.length });
    
    return tenants;
  } catch (error) {
    logger.error('Failed to list tenants', { 
      error: error.message, 
      stack: error.stack
    });
    
    throw new Error(`Failed to list tenants: ${error.message}`);
  }
}

/**
 * Delete a tenant (use with caution)
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} - Result of deletion operation
 */
async function deleteTenant(tenantId) {
  try {
    logger.warn('Deleting tenant (use with caution)', { tenantId });
    
    const tenantDataPath = path.join(__dirname, `../../data/${tenantId}`);
    
    if (!fs.existsSync(tenantDataPath)) {
      throw new Error(`Tenant ${tenantId} does not exist`);
    }
    
    // Remove the entire tenant directory
    fs.rmSync(tenantDataPath, { recursive: true, force: true });
    
    logger.info('Tenant deleted successfully', { tenantId });
    
    return {
      success: true,
      tenantId,
      message: 'Tenant deleted successfully'
    };
  } catch (error) {
    logger.error('Failed to delete tenant', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    
    throw new Error(`Failed to delete tenant ${tenantId}: ${error.message}`);
  }
}

module.exports = {
  provisionTenant,
  getTenantInfo,
  listTenants,
  deleteTenant
};