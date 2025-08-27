const supabase = require('../utils/supabaseClient');

/**
 * Authentication Middleware
 * Verify Supabase Auth tokens for protected routes
 */
async function authenticateToken(req, res, next) {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    // Validate token format
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    // Get user from Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Verify tenant ID matches request context
    const requestTenantId = req.tenantId || 'default';
    const userTenantId = data.user.user_metadata?.tenant_id || 'default';
    
    if (requestTenantId !== userTenantId) {
      return res.status(403).json({ error: 'Access denied: Tenant mismatch' });
    }
    
    // Attach user information to request object
    req.user = data.user;
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticateToken };