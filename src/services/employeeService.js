const employeeRepository = require('../repositories/employeeRepository');

/**
 * Validate employee data
 * @param {Object} employee - Employee data to validate
 * @returns {Object} - Validation result
 */
function validateEmployeeData(employee) {
  const errors = [];
  
  // Required fields
  if (!employee.employee_id) {
    errors.push('Employee ID is required');
  }
  
  if (!employee.name) {
    errors.push('Name is required');
  }
  
  if (!employee.email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
    errors.push('Email is invalid');
  }
  
  // Removed password validation as it's handled by Supabase Auth
  // Password is no longer required for employee records
  
  // Optional fields validation
  if (employee.department && employee.department.length > 50) {
    errors.push('Department must be less than 50 characters');
  }
  
  if (employee.team && employee.team.length > 50) {
    errors.push('Team must be less than 50 characters');
  }
  
  if (employee.role && employee.role.length > 50) {
    errors.push('Role must be less than 50 characters');
  }
  
  if (employee.hire_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(employee.hire_date)) {
      errors.push('Hire date must be in YYYY-MM-DD format');
    } else {
      const date = new Date(employee.hire_date);
      if (isNaN(date.getTime())) {
        errors.push('Hire date is invalid');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get all employees for a tenant with pagination
 * @param {string} tenantId - The tenant ID
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Number of records per page (default: 10)
 * @returns {Promise<Object>} - Object containing employee data and pagination info
 */
async function getEmployees(tenantId, page = 1, limit = 10) {
  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 100) {
    throw new Error('Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.');
  }
  
  return await employeeRepository.getEmployees(tenantId, page, limit);
}

/**
 * Get employee by ID for a tenant
 * @param {string} tenantId - The tenant ID
 * @param {string} employeeId - The employee ID
 * @returns {Promise<Object>} - Employee data
 */
async function getEmployeeById(tenantId, employeeId) {
  // Validate employeeId
  if (!employeeId) {
    throw new Error('Employee ID is required');
  }
  
  return await employeeRepository.getEmployeeById(tenantId, employeeId);
}

/**
 * Create a new employee
 * @param {string} tenantId - The tenant ID
 * @param {Object} employeeData - Employee data
 * @returns {Promise<Object>} - Created employee data
 */
async function createEmployee(tenantId, employeeData) {
  // Validate employee data
  const validation = validateEmployeeData(employeeData);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Check if employee ID already exists
  if (await employeeRepository.employeeIdExists(tenantId, employeeData.employee_id)) {
    throw new Error('Employee ID already exists');
  }
  
  // Check if email already exists
  if (await employeeRepository.emailExists(tenantId, employeeData.email)) {
    throw new Error('Email already exists');
  }
  
  return await employeeRepository.createEmployee(tenantId, employeeData);
}

/**
 * Update an employee
 * @param {string} tenantId - The tenant ID
 * @param {string} employeeId - The employee ID
 * @param {Object} employeeData - Employee data to update
 * @returns {Promise<Object>} - Updated employee data
 */
async function updateEmployee(tenantId, employeeId, employeeData) {
  // Validate employeeId
  if (!employeeId) {
    throw new Error('Employee ID is required');
  }
  
  // Validate employee data (if provided)
  if (Object.keys(employeeData).length > 0) {
    const validation = validateEmployeeData(employeeData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
  }
  
  return await employeeRepository.updateEmployee(tenantId, employeeId, employeeData);
}

/**
 * Delete an employee
 * @param {string} tenantId - The tenant ID
 * @param {string} employeeId - The employee ID
 * @returns {Promise<Object>} - Deleted employee data
 */
async function deleteEmployee(tenantId, employeeId) {
  // Validate employeeId
  if (!employeeId) {
    throw new Error('Employee ID is required');
  }
  
  return await employeeRepository.deleteEmployee(tenantId, employeeId);
}

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  validateEmployeeData
};