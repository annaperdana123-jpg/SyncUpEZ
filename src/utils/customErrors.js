/**
 * Custom Error Classes
 * Provides specific error types for better error handling
 */

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends Error {
  constructor(message, resource) {
    super(message);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

class DatabaseError extends Error {
  constructor(message, operation) {
    super(message);
    this.name = 'DatabaseError';
    this.operation = operation;
  }
}

class FileLockError extends Error {
  constructor(message, file) {
    super(message);
    this.name = 'FileLockError';
    this.file = file;
  }
}

module.exports = {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  FileLockError
};