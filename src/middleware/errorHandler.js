const logger = require('../utils/logger');
const { 
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  FileLockError
} = require('../utils/customErrors');

/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses and logging
 */
function errorHandler(err, req, res, next) {
  // Log the error with context
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      field: err.field
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      error: 'Authentication Error',
      message: err.message
    });
  }

  if (err instanceof AuthorizationError) {
    return res.status(403).json({
      error: 'Authorization Error',
      message: err.message
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message,
      resource: err.resource
    });
  }

  if (err instanceof DatabaseError || err instanceof FileLockError) {
    return res.status(500).json({
      error: 'Database Error',
      message: err.message,
      operation: err.operation || err.file
    });
  }

  // Handle JWT errors
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Your session has expired. Please log in again.'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Your authentication token is invalid.'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
}

module.exports = { errorHandler };