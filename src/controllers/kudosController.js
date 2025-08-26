const { readCSV } = require('../utils/csvReader');
const { appendCSV } = require('../utils/csvWriter');
const { readTenantCSV, appendToTenantCSV } = require('../utils/tenantCsvUtils');
const path = require('path');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

// Default file paths (will be overridden by tenant-specific paths)
const KUDOS_FILE = path.join(__dirname, '../../data/kudos.csv');
const EMPLOYEES_FILE = path.join(__dirname, '../../data/employees.csv');

/**
 * Validate kudos data
 * @param {Object} kudosData - Kudos data to validate
 * @returns {Object} - Validation result
 */
function validateKudosData(kudosData) {
  const errors = [];
  
  // Required fields
  if (!kudosData.from_employee_id) {
    errors.push('From employee ID is required');
  }
  
  if (!kudosData.to_employee_id) {
    errors.push('To employee ID is required');
  }
  
  if (!kudosData.message) {
    errors.push('Kudos message is required');
  } else if (kudosData.message.length > 500) {
    errors.push('Kudos message must be less than 500 characters');
  }
  
  // Business rule validation
  if (kudosData.from_employee_id && kudosData.to_employee_id) {
    if (kudosData.from_employee_id === kudosData.to_employee_id) {
      errors.push('Cannot give kudos to yourself');
    }
  }
  
  // Optional fields validation
  if (kudosData.timestamp) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!dateRegex.test(kudosData.timestamp)) {
      errors.push('Timestamp must be in ISO format');
    } else {
      const date = new Date(kudosData.timestamp);
      if (isNaN(date.getTime())) {
        errors.push('Timestamp is invalid');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if employee exists (tenant-aware)
 * @param {string} employeeId - Employee ID to check
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} - Whether employee exists
 */
async function employeeExists(employeeId, tenantId) {
  try {
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    return employees.some(emp => emp.employee_id === employeeId);
  } catch (error) {
    logger.error('Failed to check employee existence', { 
      error: error.message, 
      employeeId,
      tenantId
    });
    return false; // Assume it doesn't exist if we can't check
  }
}

/**
 * Get all kudos (tenant-aware)
 */
async function getKudos(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching all kudos', { tenantId });
    
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      logger.warn('Invalid pagination parameters', { page, limit, tenantId });
      return res.status(400).json({ 
        error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.' 
      });
    }
    
    const kudos = await readTenantCSV(tenantId, 'kudos.csv');
    
    // Apply pagination
    const paginatedKudos = kudos.slice(offset, offset + limit);
    
    logger.info('Successfully fetched kudos with pagination', { 
      page, 
      limit, 
      totalCount: kudos.length,
      returnedCount: paginatedKudos.length,
      tenantId
    });
    
    res.json({
      data: paginatedKudos,
      pagination: {
        page,
        limit,
        totalCount: kudos.length,
        totalPages: Math.ceil(kudos.length / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve kudos', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getKudos'
    });
    res.status(500).json({ error: 'Failed to retrieve kudos' });
  }
}

/**
 * Get kudos for a specific employee (tenant-aware)
 */
async function getKudosByEmployeeId(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching kudos for employee', { employeeId: id, tenantId });
    
    const kudos = await readTenantCSV(tenantId, 'kudos.csv');
    const employeeKudos = kudos.filter(k => k.to_employee_id === id);
    
    logger.info('Successfully fetched kudos for employee', { 
      employeeId: id, 
      count: employeeKudos.length,
      tenantId
    });
    res.json(employeeKudos);
  } catch (error) {
    logger.error('Failed to retrieve kudos for employee', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getKudosByEmployeeId'
    });
    res.status(500).json({ error: 'Failed to retrieve kudos' });
  }
}

/**
 * Create new kudos (tenant-aware)
 */
async function createKudos(req, res) {
  try {
    const kudosData = req.body;
    const tenantId = req.tenantId || 'default';
    logger.debug('Creating new kudos', { 
      fromEmployeeId: kudosData.from_employee_id,
      toEmployeeId: kudosData.to_employee_id,
      tenantId
    });
    
    // Validate kudos data
    const validation = validateKudosData(kudosData);
    if (!validation.isValid) {
      logger.warn('Kudos data validation failed', { 
        fromEmployeeId: kudosData.from_employee_id,
        toEmployeeId: kudosData.to_employee_id,
        errors: validation.errors,
        tenantId
      });
      throw new ValidationError('Validation failed', validation.errors);
    }
    
    // Check if from employee exists
    if (!await employeeExists(kudosData.from_employee_id, tenantId)) {
      logger.warn('From employee not found for kudos', { fromEmployeeId: kudosData.from_employee_id, tenantId });
      throw new NotFoundError('From employee not found', 'employee');
    }
    
    // Check if to employee exists
    if (!await employeeExists(kudosData.to_employee_id, tenantId)) {
      logger.warn('To employee not found for kudos', { toEmployeeId: kudosData.to_employee_id, tenantId });
      throw new NotFoundError('To employee not found', 'employee');
    }
    
    // Generate kudos ID
    const kudos_id = `kudos${Date.now()}`;
    
    // Create kudos object
    const newKudos = {
      kudos_id,
      from_employee_id: kudosData.from_employee_id,
      to_employee_id: kudosData.to_employee_id,
      message: kudosData.message,
      timestamp: kudosData.timestamp || new Date().toISOString()
    };
    
    // Define headers for kudos.csv
    const headers = [
      {id: 'kudos_id', title: 'kudos_id'},
      {id: 'from_employee_id', title: 'from_employee_id'},
      {id: 'to_employee_id', title: 'to_employee_id'},
      {id: 'message', title: 'message'},
      {id: 'timestamp', title: 'timestamp'}
    ];
    
    await appendToTenantCSV(tenantId, 'kudos.csv', headers, newKudos);
    
    logger.info('Kudos created successfully', { kudosId: kudos_id, tenantId });
    res.status(201).json({ 
      message: 'Kudos created successfully', 
      kudos: newKudos 
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: error.message,
        field: error.field
      });
    }
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: error.message,
        resource: error.resource
      });
    }
    
    logger.error('Failed to create kudos', { 
      error: error.message, 
      stack: error.stack,
      operation: 'createKudos'
    });
    res.status(500).json({ error: 'Failed to create kudos' });
  }
}

module.exports = {
  getKudos,
  getKudosByEmployeeId,
  createKudos
};