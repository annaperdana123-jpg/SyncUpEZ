const { 
  getEmployeeMetrics,
  getEmployeeHistory: fetchEmployeeHistory,
  getTeamMetrics,
  getDepartmentMetrics,
  getOverallStats,
  getTopContributors
} = require('../services/analyticsService');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/customErrors');

/**
 * Get metrics for specific employee (tenant-aware)
 */
async function getEmployeeAnalytics(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching employee analytics', { employeeId: id, tenantId });
    
    const metrics = await getEmployeeMetrics(id, tenantId);
    
    logger.info('Successfully fetched employee analytics', { employeeId: id, tenantId });
    res.json(metrics);
  } catch (error) {
    if (error.message.includes('Employee not found')) {
      logger.warn('Employee not found for analytics', { employeeId: req.params.id, tenantId: req.tenantId });
      throw new NotFoundError('Employee not found', 'employee');
    }
    
    logger.error('Failed to fetch employee analytics', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getEmployeeAnalytics',
      employeeId: req.params.id,
      tenantId: req.tenantId
    });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get historical score trends for employee (tenant-aware)
 */
async function getEmployeeHistory(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching employee history', { employeeId: id, tenantId });
    
    const history = await fetchEmployeeHistory(id, tenantId);
    
    logger.info('Successfully fetched employee history', { 
      employeeId: id, 
      count: history.length,
      tenantId
    });
    res.json(history);
  } catch (error) {
    logger.error('Failed to fetch employee history', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getEmployeeHistory',
      employeeId: req.params.id,
      tenantId: req.tenantId
    });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get metrics for specific team (tenant-aware)
 */
async function getTeamAnalytics(req, res) {
  try {
    const { teamId } = req.params;
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching team analytics', { teamId, tenantId });
    
    const metrics = await getTeamMetrics(teamId, tenantId);
    
    logger.info('Successfully fetched team analytics', { teamId, tenantId });
    res.json(metrics);
  } catch (error) {
    if (error.message.includes('Team not found')) {
      logger.warn('Team not found for analytics', { teamId: req.params.teamId, tenantId: req.tenantId });
      throw new NotFoundError('Team not found', 'team');
    }
    
    logger.error('Failed to fetch team analytics', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getTeamAnalytics',
      teamId: req.params.teamId,
      tenantId: req.tenantId
    });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get metrics for specific department (tenant-aware)
 */
async function getDepartmentAnalytics(req, res) {
  try {
    const { deptId } = req.params;
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching department analytics', { deptId, tenantId });
    
    const metrics = await getDepartmentMetrics(deptId, tenantId);
    
    logger.info('Successfully fetched department analytics', { deptId, tenantId });
    res.json(metrics);
  } catch (error) {
    if (error.message.includes('Department not found')) {
      logger.warn('Department not found for analytics', { deptId: req.params.deptId, tenantId: req.tenantId });
      throw new NotFoundError('Department not found', 'department');
    }
    
    logger.error('Failed to fetch department analytics', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getDepartmentAnalytics',
      deptId: req.params.deptId,
      tenantId: req.tenantId
    });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get overall statistics (tenant-aware)
 */
async function getStats(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching overall statistics', { tenantId });
    
    const stats = await getOverallStats(tenantId);
    
    logger.info('Successfully fetched overall statistics', { stats, tenantId });
    res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch overall statistics', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getStats',
      tenantId: req.tenantId
    });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get top contributors (tenant-aware)
 */
async function getTopContributorsCtrl(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching top contributors', { tenantId });
    
    const topContributors = await getTopContributors(tenantId);
    
    logger.info('Successfully fetched top contributors', { count: topContributors.length, tenantId });
    res.json(topContributors);
  } catch (error) {
    logger.error('Failed to fetch top contributors', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getTopContributorsCtrl',
      tenantId: req.tenantId
    });
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getEmployeeAnalytics,
  getEmployeeHistory,
  getTeamAnalytics,
  getDepartmentAnalytics,
  getStats,
  getTopContributors: getTopContributorsCtrl
};