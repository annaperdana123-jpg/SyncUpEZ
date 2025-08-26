const { readCSV } = require('../utils/csvReader');
const { appendCSV } = require('../utils/csvWriter');
const { readTenantCSV, appendToTenantCSV } = require('../utils/tenantCsvUtils');
const path = require('path');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

// Default file path (will be overridden by tenant-specific paths)
const EMPLOYEES_FILE = path.join(__dirname, '../../data/employees.csv');

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
  
  if (!employee.password) {
    errors.push('Password is required');
  } else if (employee.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
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
 * Check if employee ID already exists (tenant-aware)
 * @param {string} employeeId - Employee ID to check
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} - Whether employee ID exists
 */
async function employeeIdExists(employeeId, tenantId) {
  try {
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    return employees.some(emp => emp.employee_id === employeeId);
  } catch (error) {
    logger.error('Failed to check employee ID existence', { 
      error: error.message, 
      employeeId,
      tenantId
    });
    return false; // Assume it doesn't exist if we can't check
  }
}

/**
 * Check if email already exists (tenant-aware)
 * @param {string} email - Email to check
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} - Whether email exists
 */
async function emailExists(email, tenantId) {
  try {
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    return employees.some(emp => emp.email === email);
  } catch (error) {
    logger.error('Failed to check email existence', { 
      error: error.message, 
      email,
      tenantId
    });
    return false; // Assume it doesn't exist if we can't check
  }
}

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
    const offset = (page - 1) * limit;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      logger.warn('Invalid pagination parameters', { page, limit, tenantId });
      return res.status(400).json({ 
        error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.' 
      });
    }
    
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    
    // Apply pagination
    const paginatedEmployees = employees.slice(offset, offset + limit);
    
    logger.info('Successfully fetched employees with pagination', { 
      page, 
      limit, 
      totalCount: employees.length,
      returnedCount: paginatedEmployees.length,
      tenantId
    });
    
    res.json({
      data: paginatedEmployees,
      pagination: {
        page,
        limit,
        totalCount: employees.length,
        totalPages: Math.ceil(employees.length / limit)
      }
    });
  } catch (error) {
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
    
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    const employee = employees.find(emp => emp.employee_id === id);
    
    if (!employee) {
      logger.warn('Employee not found', { employeeId: id, tenantId });
      throw new NotFoundError('Employee not found', 'employee');
    }
    
    logger.info('Successfully fetched employee', { employeeId: id, tenantId });
    res.json(employee);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: error.message,
        resource: error.resource
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
    const employee = req.body;
    const tenantId = req.tenantId || 'default';
    logger.debug('Creating new employee', { employeeId: employee.employee_id, tenantId });
    
    // Validate employee data
    const validation = validateEmployeeData(employee);
    if (!validation.isValid) {
      logger.warn('Employee data validation failed', { 
        employeeId: employee.employee_id,
        errors: validation.errors,
        tenantId
      });
      throw new ValidationError('Validation failed', validation.errors);
    }
    
    // Check if employee ID already exists
    if (await employeeIdExists(employee.employee_id, tenantId)) {
      logger.warn('Employee ID already exists', { employeeId: employee.employee_id, tenantId });
      throw new ValidationError('Employee ID already exists', 'employee_id');
    }
    
    // Check if email already exists
    if (await emailExists(employee.email, tenantId)) {
      logger.warn('Email already exists', { email: employee.email, tenantId });
      throw new ValidationError('Email already exists', 'email');
    }
    
    // Hash password
    employee.password = await bcrypt.hash(employee.password, 10);
    
    // Define headers for employees.csv
    const headers = [
      {id: 'employee_id', title: 'employee_id'},
      {id: 'name', title: 'name'},
      {id: 'email', title: 'email'},
      {id: 'password', title: 'password'},
      {id: 'department', title: 'department'},
      {id: 'team', title: 'team'},
      {id: 'role', title: 'role'},
      {id: 'hire_date', title: 'hire_date'}
    ];
    
    await appendToTenantCSV(tenantId, 'employees.csv', headers, employee);
    
    // Remove password from response
    const { password: _, ...employeeData } = employee;
    
    logger.info('Employee created successfully', { employeeId: employee.employee_id, tenantId });
    res.status(201).json({ message: 'Employee created successfully', employee: employeeData });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: error.message,
        field: error.field
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