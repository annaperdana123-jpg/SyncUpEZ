const employeeRepository = require('../repositories/employeeRepository');
const contributionRepository = require('../repositories/contributionRepository');
const interactionRepository = require('../repositories/interactionRepository');
const kudosRepository = require('../repositories/kudosRepository');
const logger = require('../utils/logger');

/**
 * Analytics Service
 * Implements calculations for individual, team, and department metrics
 * This service is designed to be called by controllers with tenant context
 */

/**
 * Get metrics for a specific employee (tenant-aware)
 * @param {string} employeeId - Employee ID
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - Employee metrics
 */
async function getEmployeeMetrics(employeeId, tenantId) {
  try {
    logger.debug('Fetching employee metrics', { employeeId, tenantId });
    
    // Get employee data
    let employee;
    try {
      employee = await employeeRepository.getEmployeeById(tenantId, employeeId);
    } catch (error) {
      logger.warn('Employee not found for metrics', { employeeId, tenantId });
      throw new Error('Employee not found');
    }
    
    // Get latest contribution scores
    const latestContribution = await contributionRepository.getLatestContribution(tenantId, employeeId);
    
    const result = {
      employee_id: employee.employee_id,
      name: employee.name,
      current_scores: latestContribution ? {
        problem_solving_score: parseFloat(latestContribution.problem_solving_score),
        collaboration_score: parseFloat(latestContribution.collaboration_score),
        initiative_score: parseFloat(latestContribution.initiative_score),
        overall_score: parseFloat(latestContribution.overall_score)
      } : {
        problem_solving_score: 0,
        collaboration_score: 0,
        initiative_score: 0,
        overall_score: 0
      },
      team: employee.team,
      department: employee.department
    };
    
    logger.info('Successfully fetched employee metrics', { employeeId, tenantId });
    return result;
  } catch (error) {
    logger.error('Failed to get employee metrics', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getEmployeeMetrics',
      employeeId,
      tenantId
    });
    throw new Error(`Failed to get employee metrics: ${error.message}`);
  }
}

/**
 * Get historical score trends for an employee (tenant-aware)
 * @param {string} employeeId - Employee ID
 * @param {string} tenantId - Tenant ID
 * @returns {Array} - Historical scores
 */
async function getEmployeeHistory(employeeId, tenantId) {
  try {
    logger.debug('Fetching employee history', { employeeId, tenantId });
    
    const contributions = await contributionRepository.getContributionsByEmployeeId(tenantId, employeeId);
    const employeeContributions = contributions
      .map(c => ({
        date: c.calculated_at,
        problem_solving_score: parseFloat(c.problem_solving_score),
        collaboration_score: parseFloat(c.collaboration_score),
        initiative_score: parseFloat(c.initiative_score),
        overall_score: parseFloat(c.overall_score)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date
    
    logger.info('Successfully fetched employee history', { 
      employeeId, 
      count: employeeContributions.length,
      tenantId
    });
    return employeeContributions;
  } catch (error) {
    logger.error('Failed to get employee history', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getEmployeeHistory',
      employeeId,
      tenantId
    });
    throw new Error(`Failed to get employee history: ${error.message}`);
  }
}

/**
 * Get metrics for a specific team (tenant-aware)
 * @param {string} teamId - Team identifier
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - Team metrics
 */
async function getTeamMetrics(teamId, tenantId) {
  try {
    logger.debug('Fetching team metrics', { teamId, tenantId });
    
    // Get employees in the team
    const { data: employees } = await employeeRepository.getEmployees(tenantId, 1, 1000); // Get all employees
    const teamEmployees = employees.filter(emp => emp.team === teamId);
    
    if (teamEmployees.length === 0) {
      logger.warn('Team not found or has no employees', { teamId, tenantId });
      throw new Error('Team not found or has no employees');
    }
    
    // For each employee, get their latest contribution
    const latestContributions = [];
    for (const employee of teamEmployees) {
      const latestContribution = await contributionRepository.getLatestContribution(tenantId, employee.employee_id);
      if (latestContribution) {
        latestContributions.push(latestContribution);
      }
    }
    
    if (latestContributions.length === 0) {
      const result = {
        team_id: teamId,
        team_name: teamId,
        average_scores: {
          problem_solving_score: 0,
          collaboration_score: 0,
          initiative_score: 0,
          overall_score: 0
        },
        member_count: teamEmployees.length
      };
      
      logger.info('Team has no contributions yet', { teamId, tenantId });
      return result;
    }
    
    // Calculate averages
    const totalProblemSolving = latestContributions.reduce((sum, c) => sum + parseFloat(c.problem_solving_score), 0);
    const totalCollaboration = latestContributions.reduce((sum, c) => sum + parseFloat(c.collaboration_score), 0);
    const totalInitiative = latestContributions.reduce((sum, c) => sum + parseFloat(c.initiative_score), 0);
    const totalOverall = latestContributions.reduce((sum, c) => sum + parseFloat(c.overall_score), 0);
    
    const count = latestContributions.length;
    
    const result = {
      team_id: teamId,
      team_name: teamId,
      average_scores: {
        problem_solving_score: parseFloat((totalProblemSolving / count).toFixed(2)),
        collaboration_score: parseFloat((totalCollaboration / count).toFixed(2)),
        initiative_score: parseFloat((totalInitiative / count).toFixed(2)),
        overall_score: parseFloat((totalOverall / count).toFixed(2))
      },
      member_count: teamEmployees.length
    };
    
    logger.info('Successfully fetched team metrics', { teamId, tenantId });
    return result;
  } catch (error) {
    logger.error('Failed to get team metrics', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getTeamMetrics',
      teamId,
      tenantId
    });
    throw new Error(`Failed to get team metrics: ${error.message}`);
  }
}

/**
 * Get metrics for a specific department (tenant-aware)
 * @param {string} deptId - Department identifier
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - Department metrics
 */
async function getDepartmentMetrics(deptId, tenantId) {
  try {
    logger.debug('Fetching department metrics', { deptId, tenantId });
    
    // Get employees in the department
    const { data: employees } = await employeeRepository.getEmployees(tenantId, 1, 1000); // Get all employees
    const deptEmployees = employees.filter(emp => emp.department === deptId);
    
    if (deptEmployees.length === 0) {
      logger.warn('Department not found or has no employees', { deptId, tenantId });
      throw new Error('Department not found or has no employees');
    }
    
    // Get unique teams in the department
    const teams = [...new Set(deptEmployees.map(emp => emp.team))];
    
    // For each employee, get their latest contribution
    const latestContributions = [];
    for (const employee of deptEmployees) {
      const latestContribution = await contributionRepository.getLatestContribution(tenantId, employee.employee_id);
      if (latestContribution) {
        latestContributions.push(latestContribution);
      }
    }
    
    if (latestContributions.length === 0) {
      const result = {
        department_id: deptId,
        department_name: deptId,
        average_scores: {
          problem_solving_score: 0,
          collaboration_score: 0,
          initiative_score: 0,
          overall_score: 0
        },
        team_count: teams.length,
        employee_count: deptEmployees.length
      };
      
      logger.info('Department has no contributions yet', { deptId, tenantId });
      return result;
    }
    
    // Calculate averages
    const totalProblemSolving = latestContributions.reduce((sum, c) => sum + parseFloat(c.problem_solving_score), 0);
    const totalCollaboration = latestContributions.reduce((sum, c) => sum + parseFloat(c.collaboration_score), 0);
    const totalInitiative = latestContributions.reduce((sum, c) => sum + parseFloat(c.initiative_score), 0);
    const totalOverall = latestContributions.reduce((sum, c) => sum + parseFloat(c.overall_score), 0);
    
    const count = latestContributions.length;
    
    const result = {
      department_id: deptId,
      department_name: deptId,
      average_scores: {
        problem_solving_score: parseFloat((totalProblemSolving / count).toFixed(2)),
        collaboration_score: parseFloat((totalCollaboration / count).toFixed(2)),
        initiative_score: parseFloat((totalInitiative / count).toFixed(2)),
        overall_score: parseFloat((totalOverall / count).toFixed(2))
      },
      team_count: teams.length,
      employee_count: deptEmployees.length
    };
    
    logger.info('Successfully fetched department metrics', { deptId, tenantId });
    return result;
  } catch (error) {
    logger.error('Failed to get department metrics', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getDepartmentMetrics',
      deptId,
      tenantId
    });
    throw new Error(`Failed to get department metrics: ${error.message}`);
  }
}

/**
 * Get overall statistics (tenant-aware)
 * @param {string} tenantId - Tenant ID
 * @returns {Object} - Overall statistics
 */
async function getOverallStats(tenantId) {
  try {
    logger.debug('Fetching overall statistics', { tenantId });
    
    // Get all employees
    const { data: employees } = await employeeRepository.getEmployees(tenantId, 1, 1000);
    
    // Get all interactions
    const { data: interactions } = await interactionRepository.getInteractions(tenantId, 1, 10000);
    
    // Get all kudos
    const { data: kudos } = await kudosRepository.getKudos(tenantId, 1, 10000);
    
    // Get all contributions
    // For performance, we'll get a sample or use a different approach for large datasets
    let allContributions = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && allContributions.length < 10000) { // Limit to prevent performance issues
      const { data: contributions } = await contributionRepository.getContributions(tenantId, page, 100);
      allContributions = allContributions.concat(contributions);
      hasMore = contributions.length === 100;
      page++;
    }
    
    // Calculate averages from contributions
    if (allContributions.length === 0) {
      const result = {
        total_employees: employees.length,
        total_interactions: interactions.length,
        total_kudos: kudos.length,
        average_scores: {
          problem_solving_score: 0,
          collaboration_score: 0,
          initiative_score: 0,
          overall_score: 0
        }
      };
      
      logger.info('No contributions found, returning zero scores', { tenantId });
      return result;
    }
    
    // Calculate averages
    const totalProblemSolving = allContributions.reduce((sum, c) => sum + parseFloat(c.problem_solving_score), 0);
    const totalCollaboration = allContributions.reduce((sum, c) => sum + parseFloat(c.collaboration_score), 0);
    const totalInitiative = allContributions.reduce((sum, c) => sum + parseFloat(c.initiative_score), 0);
    const totalOverall = allContributions.reduce((sum, c) => sum + parseFloat(c.overall_score), 0);
    
    const count = allContributions.length;
    
    const result = {
      total_employees: employees.length,
      total_interactions: interactions.length,
      total_kudos: kudos.length,
      average_scores: {
        problem_solving_score: parseFloat((totalProblemSolving / count).toFixed(2)),
        collaboration_score: parseFloat((totalCollaboration / count).toFixed(2)),
        initiative_score: parseFloat((totalInitiative / count).toFixed(2)),
        overall_score: parseFloat((totalOverall / count).toFixed(2))
      }
    };
    
    logger.info('Successfully fetched overall statistics', { 
      totalEmployees: employees.length,
      totalInteractions: interactions.length,
      totalKudos: kudos.length,
      tenantId
    });
    return result;
  } catch (error) {
    logger.error('Failed to get overall stats', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getOverallStats',
      tenantId
    });
    throw new Error(`Failed to get overall stats: ${error.message}`);
  }
}

/**
 * Get top contributors (tenant-aware)
 * @param {string} tenantId - Tenant ID
 * @returns {Array} - Top contributors
 */
async function getTopContributors(tenantId) {
  try {
    logger.debug('Fetching top contributors', { tenantId });
    
    // Get all employees
    const { data: employees } = await employeeRepository.getEmployees(tenantId, 1, 1000);
    
    // For each employee, get their latest overall score
    const employeeScores = [];
    for (const employee of employees) {
      const latestContribution = await contributionRepository.getLatestContribution(tenantId, employee.employee_id);
      
      employeeScores.push({
        employee_id: employee.employee_id,
        name: employee.name,
        overall_score: latestContribution ? parseFloat(latestContribution.overall_score) : 0,
        department: employee.department,
        team: employee.team
      });
    }
    
    // Sort by overall score (descending) and take top 10
    const sortedScores = employeeScores
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 10);
    
    logger.info('Successfully fetched top contributors', { count: sortedScores.length, tenantId });
    return sortedScores;
  } catch (error) {
    logger.error('Failed to get top contributors', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getTopContributors',
      tenantId
    });
    throw new Error(`Failed to get top contributors: ${error.message}`);
  }
}

module.exports = {
  getEmployeeMetrics,
  getEmployeeHistory,
  getTeamMetrics,
  getDepartmentMetrics,
  getOverallStats,
  getTopContributors
};