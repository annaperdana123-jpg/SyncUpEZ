const { readCSV } = require('../utils/csvReader');
const { appendCSV } = require('../utils/csvWriter');
const { readTenantCSV, appendToTenantCSV } = require('../utils/tenantCsvUtils');
const { 
  calculateProblemSolvingScore, 
  calculateCollaborationScore, 
  calculateInitiativeScore,
  calculateOverallScore
} = require('../services/scoringService');
const path = require('path');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

// Default file paths (will be overridden by tenant-specific paths)
const CONTRIBUTIONS_FILE = path.join(__dirname, '../../data/contributions.csv');
const INTERACTIONS_FILE = path.join(__dirname, '../../data/interactions.csv');
const KUDOS_FILE = path.join(__dirname, '../../data/kudos.csv');
const EMPLOYEES_FILE = path.join(__dirname, '../../data/employees.csv');

/**
 * Validate contribution data
 * @param {Object} contributionData - Contribution data to validate
 * @returns {Object} - Validation result
 */
function validateContributionData(contributionData) {
  const errors = [];
  
  // Required fields
  if (!contributionData.employee_id) {
    errors.push('Employee ID is required');
  }
  
  // Optional score validations
  const scoreFields = [
    'problem_solving_score',
    'collaboration_score', 
    'initiative_score',
    'overall_score'
  ];
  
  scoreFields.forEach(field => {
    if (contributionData[field] !== undefined) {
      const score = parseInt(contributionData[field]);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push(`${field} must be a number between 0 and 100`);
      }
    }
  });
  
  // Date validation
  if (contributionData.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(contributionData.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    } else {
      const date = new Date(contributionData.date);
      if (isNaN(date.getTime())) {
        errors.push('Date is invalid');
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
 * Get all contribution scores (tenant-aware)
 */
async function getContributions(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching all contribution scores', { tenantId });
    
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
    
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    
    // Apply pagination
    const paginatedContributions = contributions.slice(offset, offset + limit);
    
    logger.info('Successfully fetched contribution scores with pagination', { 
      page, 
      limit, 
      totalCount: contributions.length,
      returnedCount: paginatedContributions.length,
      tenantId
    });
    
    res.json({
      data: paginatedContributions,
      pagination: {
        page,
        limit,
        totalCount: contributions.length,
        totalPages: Math.ceil(contributions.length / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve contributions', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getContributions'
    });
    res.status(500).json({ error: 'Failed to retrieve contributions' });
  }
}

/**
 * Get contribution scores for a specific employee (tenant-aware)
 */
async function getContributionsByEmployeeId(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default';
    logger.debug('Fetching contribution scores for employee', { employeeId: id, tenantId });
    
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    const employeeContributions = contributions.filter(c => c.employee_id === id);
    
    logger.info('Successfully fetched contribution scores for employee', { 
      employeeId: id, 
      count: employeeContributions.length,
      tenantId
    });
    res.json(employeeContributions);
  } catch (error) {
    logger.error('Failed to retrieve contributions for employee', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getContributionsByEmployeeId'
    });
    res.status(500).json({ error: 'Failed to retrieve contributions' });
  }
}

/**
 * Add contribution scores for an employee (tenant-aware)
 * This can be used to manually add scores or to trigger automatic calculation
 */
async function addContributionScores(req, res) {
  try {
    const contributionData = req.body;
    const tenantId = req.tenantId || 'default';
    logger.debug('Adding contribution scores for employee', { employeeId: contributionData.employee_id, tenantId });
    
    // Validate contribution data
    const validation = validateContributionData(contributionData);
    if (!validation.isValid) {
      logger.warn('Contribution data validation failed', { 
        employeeId: contributionData.employee_id,
        errors: validation.errors,
        tenantId
      });
      throw new ValidationError('Validation failed', validation.errors);
    }
    
    // Check if employee exists
    if (!await employeeExists(contributionData.employee_id, tenantId)) {
      logger.warn('Employee not found for contribution scores', { employeeId: contributionData.employee_id, tenantId });
      throw new NotFoundError('Employee not found', 'employee');
    }
    
    // Check if scores are provided manually, otherwise calculate automatically
    let { 
      problem_solving_score, 
      collaboration_score, 
      initiative_score, 
      overall_score 
    } = contributionData;
    
    // If scores are not provided manually, calculate them automatically
    if (problem_solving_score === undefined || 
        collaboration_score === undefined || 
        initiative_score === undefined || 
        overall_score === undefined) {
      
      logger.debug('Calculating contribution scores automatically', { employeeId: contributionData.employee_id, tenantId });
      
      // Get employee data
      const employees = await readTenantCSV(tenantId, 'employees.csv');
      const employee = employees.find(emp => emp.employee_id === contributionData.employee_id);
      
      if (!employee) {
        logger.warn('Employee not found for contribution scores', { employeeId: contributionData.employee_id, tenantId });
        throw new NotFoundError('Employee not found', 'employee');
      }
      
      // Get employee interactions
      const interactions = await readTenantCSV(tenantId, 'interactions.csv');
      const employeeInteractions = interactions.filter(int => int.employee_id === contributionData.employee_id);
      
      // Get employee kudos
      const kudos = await readTenantCSV(tenantId, 'kudos.csv');
      const employeeKudos = kudos.filter(k => k.to_employee_id === contributionData.employee_id);
      
      // Calculate scores if not provided
      if (problem_solving_score === undefined) {
        // Calculate average problem-solving score from interactions
        if (employeeInteractions.length > 0) {
          const totalScore = employeeInteractions.reduce((sum, interaction) => {
            return sum + calculateProblemSolvingScore(interaction.content);
          }, 0);
          problem_solving_score = Math.round(totalScore / employeeInteractions.length);
          logger.debug('Calculated problem-solving score', { 
            employeeId: contributionData.employee_id,
            score: problem_solving_score,
            tenantId
          });
        } else {
          problem_solving_score = 0;
          logger.debug('No interactions found, setting problem-solving score to 0', { 
            employeeId: contributionData.employee_id,
            tenantId
          });
        }
      }
      
      if (collaboration_score === undefined) {
        collaboration_score = calculateCollaborationScore(employeeKudos, employees);
        logger.debug('Calculated collaboration score', { 
          employeeId: contributionData.employee_id,
          score: collaboration_score,
          tenantId
        });
      }
      
      if (initiative_score === undefined) {
        // Calculate average initiative score from interactions
        if (employeeInteractions.length > 0) {
          const totalScore = employeeInteractions.reduce((sum, interaction) => {
            return sum + calculateInitiativeScore(interaction.content);
          }, 0);
          initiative_score = Math.round(totalScore / employeeInteractions.length);
          logger.debug('Calculated initiative score', { 
            employeeId: contributionData.employee_id,
            score: initiative_score,
            tenantId
          });
        } else {
          initiative_score = 0;
          logger.debug('No interactions found, setting initiative score to 0', { 
            employeeId: contributionData.employee_id,
            tenantId
          });
        }
      }
      
      if (overall_score === undefined) {
        overall_score = calculateOverallScore(
          problem_solving_score,
          collaboration_score,
          initiative_score
        );
        logger.debug('Calculated overall score', { 
          employeeId: contributionData.employee_id,
          score: overall_score,
          tenantId
        });
      }
    }
    
    // Validate score ranges (double check after calculation)
    if (problem_solving_score < 0 || problem_solving_score > 100 ||
        collaboration_score < 0 || collaboration_score > 100 ||
        initiative_score < 0 || initiative_score > 100 ||
        overall_score < 0 || overall_score > 100) {
      logger.warn('Invalid score range for contribution scores', { 
        employeeId: contributionData.employee_id,
        scores: {
          problem_solving_score,
          collaboration_score,
          initiative_score,
          overall_score
        },
        tenantId
      });
      throw new ValidationError('Scores must be between 0 and 100', 'scores');
    }
    
    // Create contribution object
    const newContribution = {
      employee_id: contributionData.employee_id,
      date: contributionData.date || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      problem_solving_score: problem_solving_score,
      collaboration_score: collaboration_score,
      initiative_score: initiative_score,
      overall_score: overall_score
    };
    
    // Define headers for contributions.csv
    const headers = [
      {id: 'employee_id', title: 'employee_id'},
      {id: 'date', title: 'date'},
      {id: 'problem_solving_score', title: 'problem_solving_score'},
      {id: 'collaboration_score', title: 'collaboration_score'},
      {id: 'initiative_score', title: 'initiative_score'},
      {id: 'overall_score', title: 'overall_score'}
    ];
    
    await appendToTenantCSV(tenantId, 'contributions.csv', headers, newContribution);
    
    logger.info('Contribution scores added successfully', { 
      employeeId: contributionData.employee_id,
      scores: newContribution,
      tenantId
    });
    res.status(201).json({ 
      message: 'Contribution scores added successfully', 
      contribution: newContribution 
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
    
    logger.error('Failed to add contribution scores', { 
      error: error.message, 
      stack: error.stack,
      operation: 'addContributionScores'
    });
    res.status(500).json({ error: 'Failed to add contribution scores' });
  }
}

module.exports = {
  getContributions,
  getContributionsByEmployeeId,
  addContributionScores
};