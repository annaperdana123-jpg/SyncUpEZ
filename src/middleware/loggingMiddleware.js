const logger = require('../utils/logger');

/**
 * Request Logging Middleware
 * Logs incoming requests and their responses with tenant information
 */
function requestLogger(req, res, next) {
  // Generate a unique request ID
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object
  req.requestId = requestId;
  
  // Get tenant ID if available
  const tenantId = req.tenantId || 'unknown';
  
  // Log the incoming request
  logger.info('Incoming request', {
    requestId,
    tenantId,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  
  // Capture the original send function
  const originalSend = res.send;
  
  // Override the send function to log the response
  res.send = function(data) {
    // Log the response
    logger.info('Outgoing response', {
      requestId,
      tenantId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Date.now() - parseInt(requestId.split('-')[0]),
      timestamp: new Date().toISOString()
    });
    
    // Call the original send function
    originalSend.call(this, data);
  };
  
  // Continue with the request
  next();
}

module.exports = { requestLogger };