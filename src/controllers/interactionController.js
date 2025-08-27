const interactionRepository = require('../repositories/interactionRepository');
const employeeRepository = require('../repositories/employeeRepository');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

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
 * Get all interactions (tenant-aware)
 */
async function getInteractions(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ 
        error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.' 
      });
    }
    
    const result = await interactionRepository.getInteractions(tenantId, page, limit);
    
    res.json(result);
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
    
    const interactions = await interactionRepository.getInteractionsByEmployeeId(tenantId, id);
    
    res.json(interactions);
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
    try {
      await employeeRepository.getEmployeeById(tenantId, interaction.employee_id);
    } catch (error) {
      logger.warn('Employee not found for interaction', { employeeId: interaction.employee_id, tenantId });
      throw new NotFoundError('Employee not found', 'employee');
    }
    
    // Add timestamp if not provided
    interaction.timestamp = interaction.timestamp || new Date().toISOString();
    
    // Create interaction object (mapping to the new schema)
    const newInteraction = {
      from_employee_id: interaction.employee_id,
      to_employee_id: interaction.employee_id,
      interaction_type: interaction.type,
      content: interaction.content,
      timestamp: interaction.timestamp,
      context_tags: interaction.context_tags || ''
    };
    
    const createdInteraction = await interactionRepository.createInteraction(tenantId, newInteraction);
    
    logger.info('Interaction created successfully', { interactionId: createdInteraction.id, tenantId });
    res.status(201).json({ 
      message: 'Interaction created successfully', 
      interaction: createdInteraction 
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