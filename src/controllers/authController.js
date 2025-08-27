const supabase = require('../utils/supabaseClient');
const employeeService = require('../services/employeeService');
const logger = require('../utils/logger');

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
    
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      logger.warn('Invalid credentials for login', { email, tenantId, error: error.message });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Add tenant context to user object
    const userWithTenant = {
      ...data.user,
      tenant_id: tenantId
    };
    
    logger.info('Login successful', { userId: data.user.id, tenantId });
    res.json({
      success: true,
      user: userWithTenant,
      session: data.session
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

async function register(req, res) {
  try {
    const { email, password, name, employee_id } = req.body;
    const tenantId = req.tenantId || 'default';
    
    logger.debug('Registration attempt', { email, employee_id, tenantId });
    
    // Validate input
    if (!email || !password || !name || !employee_id) {
      logger.warn('Missing required fields for registration', { 
        hasEmail: !!email,
        hasPassword: !!password,
        hasName: !!name,
        hasEmployeeId: !!employee_id,
        tenantId
      });
      return res.status(400).json({ error: 'Email, password, name, and employee_id are required' });
    }
    
    // Validate password strength
    if (password.length < 6) {
      logger.warn('Password too short for registration', { email, tenantId });
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          employee_id,
          tenant_id: tenantId
        }
      }
    });
    
    if (error) {
      logger.warn('Registration failed', { email, employee_id, tenantId, error: error.message });
      if (error.message.includes('already registered')) {
        return res.status(409).json({ error: 'User already registered' });
      }
      return res.status(400).json({ error: error.message });
    }
    
    // Also create employee record in employees table
    try {
      const employeeData = {
        employee_id,
        name,
        email,
        tenant_id: tenantId
      };
      
      // Create employee record (password will be handled by Supabase Auth)
      await employeeService.createEmployee(tenantId, employeeData);
    } catch (employeeError) {
      logger.warn('Failed to create employee record', { 
        email, 
        employee_id, 
        tenantId, 
        error: employeeError.message 
      });
      // Note: In a production environment, you might want to handle this more gracefully
      // For now, we'll log the error but still return success for the auth registration
    }
    
    logger.info('Registration successful', { userId: data.user.id, email, employee_id, tenantId });
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: data.user
    });
  } catch (error) {
    logger.error('Registration failed', { 
      error: error.message, 
      stack: error.stack,
      operation: 'register',
      email: req.body.email,
      employee_id: req.body.employee_id
    });
    res.status(500).json({ error: 'Registration failed' });
  }
}

module.exports = { login, register };