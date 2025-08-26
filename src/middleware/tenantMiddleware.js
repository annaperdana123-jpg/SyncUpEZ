const logger = require('../utils/logger');

/**
 * Tenant Resolution Middleware
 * Extracts tenant information from request context (subdomain, API key, or header)
 */
function resolveTenant(req, res, next) {
  try {
    // First, try to extract tenant from X-Tenant-ID header (for testing)
    const tenantIdHeader = req.get('X-Tenant-ID');
    if (tenantIdHeader) {
      req.tenantId = tenantIdHeader;
      logger.debug('Tenant identified from X-Tenant-ID header', { tenantId: req.tenantId });
      return next();
    }
    
    // Second, try to extract tenant from subdomain
    const host = req.get('host') || '';
    const subdomain = extractSubdomain(host);
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      req.tenantId = subdomain;
      logger.debug('Tenant identified from subdomain', { tenantId: req.tenantId, host });
      return next();
    }
    
    // Third, try to extract from API key header
    const apiKey = req.get('x-tenant-api-key');
    if (apiKey) {
      // In a real implementation, we would validate the API key against a database
      // For now, we'll use a simple approach where the API key is the tenant ID
      req.tenantId = apiKey;
      logger.debug('Tenant identified from API key', { tenantId: req.tenantId });
      return next();
    }
    
    // If neither method works, we might be on a shared endpoint
    // For now, we'll set a default tenant ID, but in a real SaaS app,
    // this would likely result in a 400 error
    req.tenantId = 'default';
    logger.warn('No tenant identified, using default tenant', { host, hasApiKey: !!apiKey });
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

module.exports = { resolveTenant };