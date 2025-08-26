const { readCSV } = require('../utils/csvReader');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const logger = require('../utils/logger');

const EMPLOYEES_FILE = path.join(__dirname, '../../data/employees.csv');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    // Get tenant ID from request (set by tenant middleware)
    const tenantId = req.tenantId || 'default';
    
    logger.debug('Login attempt', { email, tenantId });
    
    // Validate input
    if (!email || !password) {
      logger.warn('Missing email or password for login', { 
        hasEmail: !!email, 
        hasPassword: !!password 
      });
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find employee by email in tenant-specific directory
    const tenantDataPath = path.join(__dirname, `../../data/${tenantId}`);
    const tenantEmployeesFile = path.join(tenantDataPath, 'employees.csv');
    
    const employees = await readCSV(tenantEmployeesFile);
    const employee = employees.find(emp => emp.email === email);
    
    if (!employee) {
      logger.warn('Employee not found for login', { email, tenantId });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, employee.password);
    
    if (!isPasswordValid) {
      logger.warn('Invalid password for login', { email, tenantId });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token with tenant context
    const token = jwt.sign(
      { 
        employee_id: employee.employee_id, 
        email: employee.email,
        tenantId: tenantId
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '1h' }
    );
    
    // Remove password from response
    const { password: _, ...employeeData } = employee;
    
    logger.info('Login successful', { employeeId: employee.employee_id, tenantId });
    res.json({
      success: true,
      token,
      employee: employeeData
    });
  } catch (error) {
    logger.error('Login failed', { 
      error: error.message, 
      stack: error.stack,
      operation: 'login',
      email: req.body.email
    });
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { login };