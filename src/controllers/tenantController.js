const { provisionTenant, getTenantInfo, listTenants, deleteTenant } = require('../services/tenantService');
const logger = require('../utils/logger');

/**
 * Tenant Management Controller
 * Handles tenant-related API endpoints
 */

/**
 * Provision a new tenant
 */
async function createTenant(req, res) {
  try {
    const { tenantId, tenantData } = req.body;
    
    logger.debug('Creating new tenant', { tenantId });
    
    // Validate input
    if (!tenantId) {
      logger.warn('Missing tenant ID for tenant creation');
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    
    const result = await provisionTenant(tenantId, tenantData);
    
    logger.info('Tenant created successfully', { tenantId });
    res.status(201).json(result);
  } catch (error) {
    logger.error('Failed to create tenant', { 
      error: error.message, 
      stack: error.stack,
      operation: 'createTenant'
    });
    
    // Return 409 for conflicts (e.g., tenant already exists)
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    // Return 400 for validation errors
    if (error.message.includes('Invalid tenant ID')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get tenant information
 */
async function getTenant(req, res) {
  try {
    const { id } = req.params;
    
    logger.debug('Fetching tenant information', { tenantId: id });
    
    const tenantInfo = await getTenantInfo(id);
    
    logger.info('Tenant information retrieved', { tenantId: id });
    res.json(tenantInfo);
  } catch (error) {
    logger.error('Failed to retrieve tenant information', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getTenant'
    });
    
    // Return 404 for non-existent tenants
    if (error.message.includes('does not exist') || error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
}

/**
 * List all tenants
 */
async function getAllTenants(req, res) {
  try {
    logger.debug('Fetching all tenants');
    
    const tenants = await listTenants();
    
    logger.info('Tenants retrieved', { count: tenants.length });
    res.json({ tenants });
  } catch (error) {
    logger.error('Failed to retrieve tenants', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getAllTenants'
    });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Delete a tenant
 */
async function removeTenant(req, res) {
  try {
    const { id } = req.params;
    
    logger.warn('Deleting tenant', { tenantId: id });
    
    // In a real application, we would want additional security checks here
    // For now, we'll proceed with the deletion
    const result = await deleteTenant(id);
    
    logger.info('Tenant deleted', { tenantId: id });
    res.json(result);
  } catch (error) {
    logger.error('Failed to delete tenant', { 
      error: error.message, 
      stack: error.stack,
      operation: 'removeTenant'
    });
    
    // Return 404 for non-existent tenants
    if (error.message.includes('does not exist') || error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createTenant,
  getTenant,
  getAllTenants,
  removeTenant
};