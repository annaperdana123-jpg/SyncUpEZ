const { listTenants, getTenantInfo } = require('../services/tenantService');
const { getOverallStats } = require('../services/analyticsService');
const logger = require('../utils/logger');

/**
 * Tenant Administration Dashboard Controller
 * Provides administrative functions for managing tenants
 */

/**
 * Get tenant administration dashboard data
 */
async function getAdminDashboard(req, res) {
  try {
    logger.debug('Fetching admin dashboard data');
    
    // Get list of all tenants
    const tenants = await listTenants();
    
    // Get information for each tenant
    const tenantDetails = [];
    for (const tenantId of tenants) {
      try {
        const info = await getTenantInfo(tenantId);
        tenantDetails.push(info);
      } catch (error) {
        logger.warn('Failed to get info for tenant', { 
          tenantId, 
          error: error.message 
        });
        // Add minimal info if we can't get full info
        tenantDetails.push({ tenantId, error: error.message });
      }
    }
    
    // Get overall system stats
    // Note: In a real implementation, we might want to aggregate stats across all tenants
    const systemStats = {
      totalTenants: tenants.length,
      tenantList: tenantDetails
    };
    
    logger.info('Admin dashboard data retrieved', { 
      totalTenants: tenants.length 
    });
    
    res.json({
      message: 'Admin dashboard data retrieved successfully',
      data: systemStats
    });
  } catch (error) {
    logger.error('Failed to fetch admin dashboard data', { 
      error: error.message, 
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to retrieve admin dashboard data',
      message: error.message 
    });
  }
}

/**
 * Get dashboard data for a specific tenant
 */
async function getTenantDashboard(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching tenant dashboard data', { tenantId });
    
    // Get tenant information
    const tenantInfo = await getTenantInfo(tenantId);
    
    // Get tenant stats
    const tenantStats = await getOverallStats(tenantId);
    
    const dashboardData = {
      tenantInfo,
      stats: tenantStats
    };
    
    logger.info('Tenant dashboard data retrieved', { tenantId });
    
    res.json({
      message: 'Tenant dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    logger.error('Failed to fetch tenant dashboard data', { 
      error: error.message, 
      stack: error.stack,
      tenantId: req.tenantId
    });
    res.status(500).json({ 
      error: 'Failed to retrieve tenant dashboard data',
      message: error.message 
    });
  }
}

module.exports = {
  getAdminDashboard,
  getTenantDashboard
};