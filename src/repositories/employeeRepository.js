const supabase = require('../utils/supabaseClient');
// Removed bcrypt import as it's no longer needed

/**
 * Get all employees for a tenant with pagination
 * @param {string} tenantId - The tenant ID
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Number of records per page (default: 10)
 * @returns {Promise<Object>} - Object containing employee data and pagination info
 */
async function getEmployees(tenantId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  const { data, error, count } = await supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .range(offset, offset + limit - 1);
  
  if (error) throw new Error(error.message);
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalCount: count,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * Get employee by ID for a tenant
 * @param {string} tenantId - The tenant ID
 * @param {string} employeeId - The employee ID
 * @returns {Promise<Object>} - Employee data
 */
async function getEmployeeById(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get employee by email for a tenant
 * @param {string} tenantId - The tenant ID
 * @param {string} email - The employee email
 * @returns {Promise<Object>} - Employee data
 */
async function getEmployeeByEmail(tenantId, email) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('email', email)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Create a new employee
 * @param {string} tenantId - The tenant ID
 * @param {Object} employeeData - Employee data
 * @returns {Promise<Object>} - Created employee data
 */
async function createEmployee(tenantId, employeeData) {
  // Remove password from employee data as it's handled by Supabase Auth
  const { password, ...employeeWithoutPassword } = employeeData;
  
  const { data, error } = await supabase
    .from('employees')
    .insert([{ 
      ...employeeWithoutPassword, 
      tenant_id: tenantId
    }])
    .select();
  
  if (error) throw new Error(error.message);
  
  // Return the created employee data
  return data[0];
}

/**
 * Update an employee
 * @param {string} tenantId - The tenant ID
 * @param {string} employeeId - The employee ID
 * @param {Object} employeeData - Employee data to update
 * @returns {Promise<Object>} - Updated employee data
 */
async function updateEmployee(tenantId, employeeId, employeeData) {
  // Remove password from update data if provided
  const { password, ...updateData } = employeeData;
  
  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .select();
  
  if (error) throw new Error(error.message);
  
  return data[0];
}

/**
 * Delete an employee
 * @param {string} tenantId - The tenant ID
 * @param {string} employeeId - The employee ID
 * @returns {Promise<Object>} - Deleted employee data
 */
async function deleteEmployee(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('employees')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

/**
 * Check if employee ID already exists for a tenant
 * @param {string} tenantId - The tenant ID
 * @param {string} employeeId - The employee ID to check
 * @returns {Promise<boolean>} - Whether employee ID exists
 */
async function employeeIdExists(tenantId, employeeId) {
  try {
    const employee = await getEmployeeById(tenantId, employeeId);
    return !!employee;
  } catch (error) {
    // If error is "not found", return false
    if (error.message.includes('not found')) {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if email already exists for a tenant
 * @param {string} tenantId - The tenant ID
 * @param {string} email - The email to check
 * @returns {Promise<boolean>} - Whether email exists
 */
async function emailExists(tenantId, email) {
  try {
    const employee = await getEmployeeByEmail(tenantId, email);
    return !!employee;
  } catch (error) {
    // If error is "not found", return false
    if (error.message.includes('not found')) {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  employeeIdExists,
  emailExists
};