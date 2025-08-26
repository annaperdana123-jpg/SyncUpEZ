const jwt = require('jsonwebtoken');
const { readCSV } = require('../utils/csvReader');
const path = require('path');

const EMPLOYEES_FILE = path.join(__dirname, '../../data/employees.csv');

/**
 * Authentication Middleware
 * Verify JWT tokens for protected routes
 */
async function authenticateToken(req, res, next) {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    
    // Store tenant ID from token
    const tokenTenantId = decoded.tenantId || 'default';
    
    // Get tenant ID from request (set by tenant middleware)
    const requestTenantId = req.tenantId || 'default';
    
    // Validate that tenant ID in token matches tenant ID in request
    if (tokenTenantId !== requestTenantId) {
      return res.status(401).json({ error: 'Token tenant mismatch' });
    }
    
    // Set tenant ID on request
    req.tenantId = tokenTenantId;
    
    // Get employee data
    // In a SaaS implementation, we would look in the tenant-specific directory
    const tenantDataPath = path.join(__dirname, `../../data/${req.tenantId}`);
    const tenantEmployeesFile = path.join(tenantDataPath, 'employees.csv');
    
    // Check if tenant directory exists, if not fall back to default
    const employees = await readCSV(tenantEmployeesFile);
    const employee = employees.find(emp => emp.employee_id === decoded.employee_id);
    
    if (!employee) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Attach user information to request object
    req.user = {
      employee_id: employee.employee_id,
      email: employee.email,
      name: employee.name,
      department: employee.department,
      team: employee.team,
      role: employee.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticateToken };