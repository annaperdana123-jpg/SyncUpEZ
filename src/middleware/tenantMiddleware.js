const logger = require('../utils/logger');
const supabase = require('../utils/supabaseClient');

/**
 * Tenant Resolution Middleware
 * Extracts tenant information from request context (subdomain, API key, or header)
 */
async function resolveTenant(req, res, next) {
  try {
    // First, try to extract tenant from X-Tenant-ID header (for testing)
    const tenantIdHeader = req.get('X-Tenant-ID');
    if (tenantIdHeader) {
      req.tenantId = tenantIdHeader;
      logger.debug('Tenant identified from X-Tenant-ID header', { tenantId: req.tenantId });
      await setTenantContext(req.tenantId);
      return next();
    }
    
    // Second, try to extract tenant from subdomain
    const host = req.get('host') || '';
    const subdomain = extractSubdomain(host);
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      req.tenantId = subdomain;
      logger.debug('Tenant identified from subdomain', { tenantId: req.tenantId, host });
      await setTenantContext(req.tenantId);
      return next();
    }
    
    // Third, try to extract from API key header
    const apiKey = req.get('x-tenant-api-key');
    if (apiKey) {
      // In a real implementation, we would validate the API key against a database
      // For now, we'll use a simple approach where the API key is the tenant ID
      req.tenantId = apiKey;
      logger.debug('Tenant identified from API key', { tenantId: req.tenantId });
      await setTenantContext(req.tenantId);
      return next();
    }
    
    // If neither method works, we might be on a shared endpoint
    // For now, we'll set a default tenant ID, but in a real SaaS app,
    // this would likely result in a 400 error
    req.tenantId = 'default';
    logger.warn('No tenant identified, using default tenant', { host, hasApiKey: !!apiKey });
    await setTenantContext(req.tenantId);
    next();
  } catch (error) {
    logger.error('Error resolving tenant', { 
      error: error.message, 
      stack: error.stack,
      operation: 'resolveTenant'
    });
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
}

/**
 * Extract subdomain from host
 * @param {string} host - The host header from the request
 * @returns {string|null} - The subdomain or null if not found
 */
function extractSubdomain(host) {
  try {
    // Remove port if present
    const hostname = host.split(':')[0];
    
    // Split by dots
    const parts = hostname.split('.');
    
    // If we have more than 2 parts, the first part is the subdomain
    // e.g., "company.syncup.com" -> "company"
    if (parts.length > 2) {
      return parts[0];
    }
    
    return null;
  } catch (error) {
    logger.error('Error extracting subdomain', { 
      host, 
      error: error.message,
      operation: 'extractSubdomain'
    });
    return null;
  }
}

/**
 * Set tenant context for Supabase RLS
 * @param {string} tenantId - The tenant ID
 */
async function setTenantContext(tenantId) {
  try {
    // Call the Supabase RPC function to set tenant context
    // This will be used by RLS policies to enforce tenant isolation
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
  } catch (error) {
    logger.error('Error setting tenant context', { 
      tenantId,
      error: error.message,
      operation: 'setTenantContext'
    });
    // We don't throw here as this is an enhancement for RLS
    // The application should still function without it
  }
}

module.exports = { resolveTenant };