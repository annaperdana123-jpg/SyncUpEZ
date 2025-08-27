const employeeService = require('../services/employeeService');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

/**
 * Get all employees (tenant-aware)
 */
async function getEmployees(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching all employees', { tenantId });
    
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await employeeService.getEmployees(tenantId, page, limit);
    
    logger.info('Successfully fetched employees with pagination', { 
      page, 
      limit, 
      totalCount: result.pagination.totalCount,
      returnedCount: result.data.length,
      tenantId
    });
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Invalid pagination parameters')) {
      logger.warn('Invalid pagination parameters', { error: error.message });
      return res.status(400).json({ 
        error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.' 
      });
    }
    
    logger.error('Failed to retrieve employees', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getEmployees'
    });
    res.status(500).json({ error: 'Failed to retrieve employees' });
  }
}

/**
 * Get employee by ID (tenant-aware)
 */
async function getEmployeeById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching employee by ID', { employeeId: id, tenantId });
    
    const employee = await employeeService.getEmployeeById(tenantId, id);
    
    logger.info('Successfully fetched employee', { employeeId: id, tenantId });
    res.json(employee);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('required')) {
      logger.warn('Employee not found', { employeeId: req.params.id, tenantId: req.tenantId });
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Employee not found'
      });
    }
    
    logger.error('Failed to retrieve employee', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getEmployeeById'
    });
    res.status(500).json({ error: 'Failed to retrieve employee' });
  }
}

/**
 * Create new employee (tenant-aware)
 */
async function createEmployee(req, res) {
  try {
    const employeeData = req.body;
    const tenantId = req.tenantId || 'default';
    logger.debug('Creating new employee', { employeeId: employeeData.employee_id, tenantId });
    
    const employee = await employeeService.createEmployee(tenantId, employeeData);
    
    logger.info('Employee created successfully', { employeeId: employee.employee_id, tenantId });
    res.status(201).json({ message: 'Employee created successfully', employee });
  } catch (error) {
    if (error.message.includes('Validation failed') || 
        error.message.includes('already exists') || 
        error.message.includes('required') || 
        error.message.includes('invalid')) {
      logger.warn('Employee data validation failed', { 
        employeeId: req.body.employee_id,
        error: error.message,
        tenantId: req.tenantId
      });
      return res.status(400).json({ 
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('already exists')) {
      logger.warn('Employee already exists', { 
        employeeId: req.body.employee_id,
        error: error.message,
        tenantId: req.tenantId
      });
      return res.status(409).json({ 
        error: 'Conflict',
        message: error.message
      });
    }
    
    logger.error('Failed to create employee', { 
      error: error.message, 
      stack: error.stack,
      operation: 'createEmployee'
    });
    res.status(500).json({ error: 'Failed to create employee' });
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee
};