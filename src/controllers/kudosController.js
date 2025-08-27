const kudosRepository = require('../repositories/kudosRepository');
const employeeRepository = require('../repositories/employeeRepository');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

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
 * Get all kudos (tenant-aware)
 */
async function getKudos(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching all kudos', { tenantId });
    
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      logger.warn('Invalid pagination parameters', { page, limit, tenantId });
      return res.status(400).json({ 
        error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.' 
      });
    }
    
    const result = await kudosRepository.getKudos(tenantId, page, limit);
    
    logger.info('Successfully fetched kudos with pagination', { 
      page, 
      limit, 
      totalCount: result.pagination.totalCount,
      returnedCount: result.data.length,
      tenantId
    });
    
    res.json(result);
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
    
    const kudos = await kudosRepository.getKudosByEmployeeId(tenantId, id);
    
    logger.info('Successfully fetched kudos for employee', { 
      employeeId: id, 
      count: kudos.length,
      tenantId
    });
    res.json(kudos);
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
    try {
      await employeeRepository.getEmployeeById(tenantId, kudosData.from_employee_id);
    } catch (error) {
      logger.warn('From employee not found for kudos', { fromEmployeeId: kudosData.from_employee_id, tenantId });
      throw new NotFoundError('From employee not found', 'employee');
    }
    
    // Check if to employee exists
    try {
      await employeeRepository.getEmployeeById(tenantId, kudosData.to_employee_id);
    } catch (error) {
      logger.warn('To employee not found for kudos', { toEmployeeId: kudosData.to_employee_id, tenantId });
      throw new NotFoundError('To employee not found', 'employee');
    }
    
    // Create kudos object
    const newKudos = {
      from_employee_id: kudosData.from_employee_id,
      to_employee_id: kudosData.to_employee_id,
      message: kudosData.message,
      timestamp: kudosData.timestamp || new Date().toISOString()
    };
    
    const createdKudos = await kudosRepository.createKudos(tenantId, newKudos);
    
    logger.info('Kudos created successfully', { kudosId: createdKudos.id, tenantId });
    res.status(201).json({ 
      message: 'Kudos created successfully', 
      kudos: createdKudos 
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