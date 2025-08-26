const { readCSV } = require('../utils/csvReader');
const { appendCSV } = require('../utils/csvWriter');
const { readTenantCSV, appendToTenantCSV } = require('../utils/tenantCsvUtils');
const path = require('path');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

// Default file paths (will be overridden by tenant-specific paths)
const INTERACTIONS_FILE = path.join(__dirname, '../../data/interactions.csv');
const EMPLOYEES_FILE = path.join(__dirname, '../../data/employees.csv');

/**
 * Validate interaction data
 * @param {Object} interaction - Interaction data to validate
 * @returns {Object} - Validation result
 */
function validateInteractionData(interaction) {
  const errors = [];
  
  // Required fields
  if (!interaction.employee_id) {
    errors.push('Employee ID is required');
  }
  
  if (!interaction.type) {
    errors.push('Interaction type is required');
  } else if (interaction.type.length > 50) {
    errors.push('Interaction type must be less than 50 characters');
  }
  
  if (!interaction.content) {
    errors.push('Interaction content is required');
  } else if (interaction.content.length > 1000) {
    errors.push('Interaction content must be less than 1000 characters');
  }
  
  // Optional fields validation
  if (interaction.timestamp) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!dateRegex.test(interaction.timestamp)) {
      errors.push('Timestamp must be in ISO format');
    } else {
      const date = new Date(interaction.timestamp);
      if (isNaN(date.getTime())) {
        errors.push('Timestamp is invalid');
      }
    }
  }
  
  if (interaction.context_tags && interaction.context_tags.length > 200) {
    errors.push('Context tags must be less than 200 characters');
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
 * Get all interactions (tenant-aware)
 */
async function getInteractions(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching all interactions', { tenantId });
    
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
    
    const interactions = await readTenantCSV(tenantId, 'interactions.csv');
    
    // Apply pagination
    const paginatedInteractions = interactions.slice(offset, offset + limit);
    
    logger.info('Successfully fetched interactions with pagination', { 
      page, 
      limit, 
      totalCount: interactions.length,
      returnedCount: paginatedInteractions.length,
      tenantId
    });
    
    res.json({
      data: paginatedInteractions,
      pagination: {
        page,
        limit,
        totalCount: interactions.length,
        totalPages: Math.ceil(interactions.length / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve interactions', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getInteractions'
    });
    res.status(500).json({ error: 'Failed to retrieve interactions' });
  }
}

/**
 * Get interactions by employee ID (tenant-aware)
 */
async function getInteractionsByEmployeeId(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching interactions by employee ID', { employeeId: id, tenantId });
    
    const interactions = await readTenantCSV(tenantId, 'interactions.csv');
    const employeeInteractions = interactions.filter(interaction => interaction.employee_id === id);
    
    logger.info('Successfully fetched interactions for employee', { 
      employeeId: id, 
      count: employeeInteractions.length,
      tenantId
    });
    res.json(employeeInteractions);
  } catch (error) {
    logger.error('Failed to retrieve interactions for employee', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getInteractionsByEmployeeId'
    });
    res.status(500).json({ error: 'Failed to retrieve interactions' });
  }
}

/**
 * Create new interaction (tenant-aware)
 */
async function createInteraction(req, res) {
  try {
    const interaction = req.body;
    const tenantId = req.tenantId || 'default';
    logger.debug('Creating new interaction', { employeeId: interaction.employee_id, tenantId });
    
    // Validate interaction data
    const validation = validateInteractionData(interaction);
    if (!validation.isValid) {
      logger.warn('Interaction data validation failed', { 
        employeeId: interaction.employee_id,
        errors: validation.errors,
        tenantId
      });
      throw new ValidationError('Validation failed', validation.errors);
    }
    
    // Check if employee exists
    if (!await employeeExists(interaction.employee_id, tenantId)) {
      logger.warn('Employee not found for interaction', { employeeId: interaction.employee_id, tenantId });
      throw new NotFoundError('Employee not found', 'employee');
    }
    
    // Generate interaction ID
    const interaction_id = `int${Date.now()}`;
    
    // Add timestamp if not provided
    interaction.timestamp = interaction.timestamp || new Date().toISOString();
    
    // Create interaction object
    const newInteraction = {
      interaction_id,
      employee_id: interaction.employee_id,
      type: interaction.type,
      content: interaction.content,
      timestamp: interaction.timestamp,
      context_tags: interaction.context_tags || ''
    };
    
    // Define headers for interactions.csv
    const headers = [
      {id: 'interaction_id', title: 'interaction_id'},
      {id: 'employee_id', title: 'employee_id'},
      {id: 'type', title: 'type'},
      {id: 'content', title: 'content'},
      {id: 'timestamp', title: 'timestamp'},
      {id: 'context_tags', title: 'context_tags'}
    ];
    
    await appendToTenantCSV(tenantId, 'interactions.csv', headers, newInteraction);
    
    logger.info('Interaction created successfully', { interactionId: interaction_id, tenantId });
    res.status(201).json({ 
      message: 'Interaction created successfully', 
      interaction: newInteraction 
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
    
    logger.error('Failed to create interaction', { 
      error: error.message, 
      stack: error.stack,
      operation: 'createInteraction'
    });
    res.status(500).json({ error: 'Failed to create interaction' });
  }
}

module.exports = {
  getInteractions,
  getInteractionsByEmployeeId,
  createInteraction
};