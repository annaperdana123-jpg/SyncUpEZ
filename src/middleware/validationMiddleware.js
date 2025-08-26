/**
 * Validation Middleware
 * Validate request data and ensure referential integrity
 */

/**
 * Validate UUID format
 * @param {string} id - ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
function isValidUUID(id) {
  if (!id) return false;
  // Simple UUID validation (you might want to use a more robust regex)
  const uuidRegex = /^[a-zA-Z0-9-_]+$/;
  return uuidRegex.test(id);
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date to validate
 * @returns {boolean} - Whether the date is valid
 */
function isValidDate(date) {
  if (!date) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const d = new Date(date);
  return d instanceof Date && !isNaN(d) && d.toISOString().slice(0, 10) === date;
}

/**
 * Validate score range (0-100)
 * @param {number} score - Score to validate
 * @returns {boolean} - Whether the score is valid
 */
function isValidScore(score) {
  if (score === undefined || score === null) return false;
  const numScore = Number(score);
  return Number.isInteger(numScore) && numScore >= 0 && numScore <= 100;
}

/**
 * Validate employee ID
 */
function validateEmployeeId(req, res, next) {
  const { id } = req.params;
  
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid employee ID format' });
  }
  
  next();
}

/**
 * Validate interaction data
 */
function validateInteraction(req, res, next) {
  const { employee_id, type, content } = req.body;
  
  if (!employee_id) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }
  
  if (!isValidUUID(employee_id)) {
    return res.status(400).json({ error: 'Invalid employee ID format' });
  }
  
  if (!type) {
    return res.status(400).json({ error: 'Interaction type is required' });
  }
  
  if (!content) {
    return res.status(400).json({ error: 'Interaction content is required' });
  }
  
  next();
}

/**
 * Validate kudos data
 */
function validateKudos(req, res, next) {
  const { from_employee_id, to_employee_id, message } = req.body;
  
  if (!from_employee_id) {
    return res.status(400).json({ error: 'From employee ID is required' });
  }
  
  if (!isValidUUID(from_employee_id)) {
    return res.status(400).json({ error: 'Invalid from employee ID format' });
  }
  
  if (!to_employee_id) {
    return res.status(400).json({ error: 'To employee ID is required' });
  }
  
  if (!isValidUUID(to_employee_id)) {
    return res.status(400).json({ error: 'Invalid to employee ID format' });
  }
  
  if (from_employee_id === to_employee_id) {
    return res.status(400).json({ error: 'Cannot give kudos to yourself' });
  }
  
  if (!message) {
    return res.status(400).json({ error: 'Kudos message is required' });
  }
  
  next();
}

/**
 * Validate contribution scores
 */
function validateContributionScores(req, res, next) {
  const { employee_id, problem_solving_score, collaboration_score, initiative_score, overall_score } = req.body;
  
  if (!employee_id) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }
  
  if (!isValidUUID(employee_id)) {
    return res.status(400).json({ error: 'Invalid employee ID format' });
  }
  
  // If scores are provided, validate them
  if (problem_solving_score !== undefined && !isValidScore(problem_solving_score)) {
    return res.status(400).json({ error: 'Problem solving score must be an integer between 0 and 100' });
  }
  
  if (collaboration_score !== undefined && !isValidScore(collaboration_score)) {
    return res.status(400).json({ error: 'Collaboration score must be an integer between 0 and 100' });
  }
  
  if (initiative_score !== undefined && !isValidScore(initiative_score)) {
    return res.status(400).json({ error: 'Initiative score must be an integer between 0 and 100' });
  }
  
  if (overall_score !== undefined && !isValidScore(overall_score)) {
    return res.status(400).json({ error: 'Overall score must be an integer between 0 and 100' });
  }
  
  next();
}

/**
 * Validate date parameter
 */
function validateDate(req, res, next) {
  const { date } = req.params;
  
  if (date && !isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  next();
}

module.exports = {
  validateEmployeeId,
  validateInteraction,
  validateKudos,
  validateContributionScores,
  validateDate
};