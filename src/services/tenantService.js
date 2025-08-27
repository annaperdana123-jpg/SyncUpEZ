const tenantRepository = require('../repositories/tenantRepository');
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
    
    // Check if tenant already exists
    const exists = await tenantRepository.tenantExists(tenantId);
    if (exists) {
      logger.warn('Tenant already exists', { tenantId });
      throw new Error(`Tenant ${tenantId} already exists`);
    }
    
    // Create tenant in database
    const tenant = await tenantRepository.createTenant(tenantId, tenantData);
    
    logger.info('Tenant provisioned successfully', { tenantId });
    
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
 * Get tenant information
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} - Tenant information
 */
async function getTenantInfo(tenantId) {
  try {
    logger.debug('Fetching tenant information', { tenantId });
    
    const tenant = await tenantRepository.getTenantById(tenantId);
    
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} does not exist`);
    }
    
    logger.info('Tenant information retrieved', { tenantId });
    
    return {
      tenantId: tenant.tenant_id,
      name: tenant.name,
      description: tenant.description,
      contact_email: tenant.contact_email,
      createdAt: tenant.created_at
    };
  } catch (error) {
    logger.error('Failed to get tenant info', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    
    // For non-existent tenants, we should return a 404, not a 500
    if (error.message.includes('does not exist')) {
      throw error;
    }
    
    throw new Error(`Failed to get tenant info for ${tenantId}: ${error.message}`);
  }
}

/**
 * List all tenants
 * @returns {Promise<Array>} - List of tenant IDs
 */
async function listTenants() {
  try {
    logger.debug('Fetching all tenants');
    
    const tenants = await tenantRepository.listTenants();
    
    logger.info('Tenants retrieved', { count: tenants.length });
    
    return tenants.map(tenant => ({
      tenantId: tenant.tenant_id,
      name: tenant.name,
      description: tenant.description,
      contact_email: tenant.contact_email,
      createdAt: tenant.created_at
    }));
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
    
    // Check if tenant exists
    const exists = await tenantRepository.tenantExists(tenantId);
    if (!exists) {
      throw new Error(`Tenant ${tenantId} does not exist`);
    }
    
    // Delete tenant from database
    const tenant = await tenantRepository.deleteTenant(tenantId);
    
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
    
    // For non-existent tenants, we should return a 404, not a 500
    if (error.message.includes('does not exist')) {
      throw error;
    }
    
    throw new Error(`Failed to delete tenant ${tenantId}: ${error.message}`);
  }
}

module.exports = {
  provisionTenant,
  getTenantInfo,
  listTenants,
  deleteTenant
};