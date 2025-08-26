const { readTenantCSV } = require('../utils/tenantCsvUtils');
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
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    const employee = employees.find(emp => emp.employee_id === employeeId);
    
    if (!employee) {
      logger.warn('Employee not found for metrics', { employeeId, tenantId });
      throw new Error('Employee not found');
    }
    
    // Get latest contribution scores
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    const employeeContributions = contributions.filter(c => c.employee_id === employeeId);
    
    // Get latest contribution (assuming the last entry is the latest)
    const latestContribution = employeeContributions.length > 0 
      ? employeeContributions[employeeContributions.length - 1] 
      : null;
    
    const result = {
      employee_id: employee.employee_id,
      name: employee.name,
      current_scores: latestContribution ? {
        problem_solving_score: parseInt(latestContribution.problem_solving_score),
        collaboration_score: parseInt(latestContribution.collaboration_score),
        initiative_score: parseInt(latestContribution.initiative_score),
        overall_score: parseInt(latestContribution.overall_score)
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
    
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    const employeeContributions = contributions
      .filter(c => c.employee_id === employeeId)
      .map(c => ({
        date: c.date,
        problem_solving_score: parseInt(c.problem_solving_score),
        collaboration_score: parseInt(c.collaboration_score),
        initiative_score: parseInt(c.initiative_score),
        overall_score: parseInt(c.overall_score)
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
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    const teamEmployees = employees.filter(emp => emp.team === teamId);
    
    if (teamEmployees.length === 0) {
      logger.warn('Team not found or has no employees', { teamId, tenantId });
      throw new Error('Team not found or has no employees');
    }
    
    // Get latest contributions for all team members
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    
    // For each employee, get their latest contribution
    const latestContributions = teamEmployees.map(employee => {
      const employeeContributions = contributions.filter(c => c.employee_id === employee.employee_id);
      return employeeContributions.length > 0 
        ? employeeContributions[employeeContributions.length - 1] 
        : null;
    }).filter(c => c !== null); // Remove employees with no contributions
    
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
    const totalProblemSolving = latestContributions.reduce((sum, c) => sum + parseInt(c.problem_solving_score), 0);
    const totalCollaboration = latestContributions.reduce((sum, c) => sum + parseInt(c.collaboration_score), 0);
    const totalInitiative = latestContributions.reduce((sum, c) => sum + parseInt(c.initiative_score), 0);
    const totalOverall = latestContributions.reduce((sum, c) => sum + parseInt(c.overall_score), 0);
    
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
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    const deptEmployees = employees.filter(emp => emp.department === deptId);
    
    if (deptEmployees.length === 0) {
      logger.warn('Department not found or has no employees', { deptId, tenantId });
      throw new Error('Department not found or has no employees');
    }
    
    // Get unique teams in the department
    const teams = [...new Set(deptEmployees.map(emp => emp.team))];
    
    // Get latest contributions for all department members
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    
    // For each employee, get their latest contribution
    const latestContributions = deptEmployees.map(employee => {
      const employeeContributions = contributions.filter(c => c.employee_id === employee.employee_id);
      return employeeContributions.length > 0 
        ? employeeContributions[employeeContributions.length - 1] 
        : null;
    }).filter(c => c !== null); // Remove employees with no contributions
    
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
    const totalProblemSolving = latestContributions.reduce((sum, c) => sum + parseInt(c.problem_solving_score), 0);
    const totalCollaboration = latestContributions.reduce((sum, c) => sum + parseInt(c.collaboration_score), 0);
    const totalInitiative = latestContributions.reduce((sum, c) => sum + parseInt(c.initiative_score), 0);
    const totalOverall = latestContributions.reduce((sum, c) => sum + parseInt(c.overall_score), 0);
    
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
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    
    // Get all interactions
    const interactions = await readTenantCSV(tenantId, 'interactions.csv');
    
    // Get all kudos
    const kudos = await readTenantCSV(tenantId, 'kudos.csv');
    
    // Get all contributions
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    
    // Calculate averages from contributions
    if (contributions.length === 0) {
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
    const totalProblemSolving = contributions.reduce((sum, c) => sum + parseInt(c.problem_solving_score), 0);
    const totalCollaboration = contributions.reduce((sum, c) => sum + parseInt(c.collaboration_score), 0);
    const totalInitiative = contributions.reduce((sum, c) => sum + parseInt(c.initiative_score), 0);
    const totalOverall = contributions.reduce((sum, c) => sum + parseInt(c.overall_score), 0);
    
    const count = contributions.length;
    
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
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    
    // Get all contributions
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    
    // For each employee, get their latest overall score
    const employeeScores = employees.map(employee => {
      const employeeContributions = contributions.filter(c => c.employee_id === employee.employee_id);
      const latestContribution = employeeContributions.length > 0 
        ? employeeContributions[employeeContributions.length - 1] 
        : null;
      
      return {
        employee_id: employee.employee_id,
        name: employee.name,
        overall_score: latestContribution ? parseInt(latestContribution.overall_score) : 0,
        department: employee.department,
        team: employee.team
      };
    });
    
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