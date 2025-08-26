# Testing Guide for SyncUpEZ SaaS Application

## Overview

This document provides a comprehensive guide on how to test the SyncUpEZ SaaS application, which is a multi-tenant platform built with Node.js and Express, using CSV files for data storage. The application implements a Continuous Contribution Graph for employee engagement tracking.

## Technology Stack & Dependencies

- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Testing Framework**: Jest
- **HTTP Testing**: Supertest
- **Data Storage**: CSV files (no databases)
- **Authentication**: JWT with bcrypt password hashing
- **Logging**: Winston

## Testing Structure

The application follows a two-tiered testing approach:

1. **Unit Tests**: Test individual services and middleware components in isolation
2. **Integration Tests**: Test complete API endpoints and workflows

### Test Directory Structure

```
test/
├── analyticsService.test.js     # Unit tests for analytics service
├── authMiddleware.test.js       # Unit tests for authentication middleware
├── csvUtils.test.js             # Unit tests for CSV utilities
├── integration.test.js          # Integration tests for API endpoints
├── scoringService.test.js       # Unit tests for scoring service
└── validationMiddleware.test.js # Unit tests for validation middleware
```

## Running Tests

### Available Test Scripts

The application provides several npm scripts for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Execution Environment

Tests are configured to run in a Node.js environment with Jest as the test runner. The configuration is specified in `package.json`:

```json
"jest": {
  "testEnvironment": "node",
  "collectCoverageFrom": [
    "src/**/*.js",
    "!src/index.js"
  ]
}
```

## Unit Testing Approach

### Service Layer Testing

Services are tested by mocking their dependencies, particularly file I/O operations:

```javascript
// Example from analyticsService.test.js
jest.mock('../src/utils/csvReader', () => ({
  readCSV: jest.fn((filePath) => {
    // Return mock data based on the file path
    if (filePath.includes('employees.csv')) {
      return Promise.resolve([
        { employee_id: 'emp1', name: 'John Doe', team: 'TeamA', department: 'DeptA' }
      ]);
    }
    // ... other file mocks
    return Promise.resolve([]);
  })
}));
```

### Middleware Testing

Middleware components are tested by creating mock request, response, and next function objects:

```javascript
// Example from authMiddleware.test.js
const mockRequest = {
  headers: {
    authorization: 'Bearer valid-token'
  }
};

const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
};

const mockNext = jest.fn();
```

## Integration Testing Approach

Integration tests use Supertest to make actual HTTP requests to the Express application without starting a server:

```javascript
// Example from integration.test.js
const request = require('supertest');
const app = require('../server');

test('should create a new employee', async () => {
  const response = await request(app)
    .post('/api/employees')
    .send(mockEmployee)
    .expect(201);
  
  expect(response.body).toHaveProperty('message', 'Employee created successfully');
});
```

### Test Data Management

To ensure test isolation, each test run uses unique identifiers generated with timestamps:

```javascript
const timestamp = Date.now();
const mockEmployee = {
  employee_id: `emp_test_${timestamp}`,
  name: 'Test User',
  email: `test${timestamp}@example.com`,
  // ... other properties
};
```

## SaaS-Specific Testing Considerations

### Multi-Tenancy Testing

Since the application is a multi-tenant SaaS platform, tests must verify:

1. **Tenant Isolation**: Data from one tenant should not be accessible by another tenant
2. **Tenant Context**: All operations should be scoped to the correct tenant
3. **Provisioning**: Tenant creation and deletion should work correctly

### Authentication with Tenant Context

Tests should verify that JWT tokens include tenant context and that authentication properly scopes access to tenant data.

## Testing Different Components

### 1. Authentication Testing

- Test user registration and login
- Verify JWT token generation and validation
- Ensure unauthorized access is properly rejected
- Test tenant context in authentication tokens

### 2. Employee Management Testing

- Test creating, reading, updating, and deleting employees
- Verify proper data validation
- Ensure tenant isolation in employee data

### 3. Interaction Tracking Testing

- Test creating and retrieving interactions
- Verify interaction categorization
- Ensure proper pagination

### 4. Kudos System Testing

- Test sending and receiving kudos
- Verify kudos metrics calculation
- Ensure proper validation

### 5. Contribution Scoring Testing

- Test adding and retrieving contribution scores
- Verify score calculation algorithms
- Ensure historical data tracking

### 6. Analytics Testing

- Test employee metrics calculation
- Verify team and department metrics
- Ensure proper aggregation of data
- Test top contributors ranking

### 7. Backup System Testing

- Test creating tenant-specific backups
- Verify backup restoration
- Ensure backup scheduling works

### 8. CSV Data Integrity Testing

Since the application relies entirely on CSV files for data storage, special attention should be paid to data integrity:

1. **File Append Operations**: Test that concurrent writes don't corrupt data
2. **Data Consistency**: Verify that data reads match what was written
3. **File Locking**: Ensure proper file locking mechanisms prevent race conditions
4. **Error Recovery**: Test how the application handles corrupted CSV files
5. **Empty Line Handling**: Verify proper handling of newlines and empty lines at file ends

Example test for CSV integrity:
```javascript
// Test concurrent writes don't cause duplication
test('should handle concurrent writes without duplication', async () => {
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(createEmployee(employeeData));
  }
  
  await Promise.all(promises);
  
  const employees = await getAllEmployees();
  const uniqueIds = new Set(employees.map(e => e.employee_id));
  
  // Verify no duplicate entries
  expect(employees.length).toBe(uniqueIds.size);
});
```

## Multi-Tenancy Testing

### Tenant Isolation Testing

To ensure proper data isolation between tenants, implement tests that:

1. Create data in one tenant
2. Verify that data is not accessible from another tenant
3. Confirm that operations in one tenant do not affect another tenant's data

Example test scenario:
```javascript
// Test that Tenant A cannot access Tenant B's data
test('should prevent cross-tenant data access', async () => {
  // Create data for tenantA
  await createEmployee(tenantA, employeeData);
  
  // Attempt to access from tenantB should fail
  const response = await request(app)
    .get(`/api/employees/${employeeId}`)
    .set('X-Tenant-ID', tenantB)
    .set('Authorization', `Bearer ${tenantBToken}`)
    .expect(404);
});
```

### Tenant Provisioning Testing

Test the complete tenant lifecycle:

1. Creating new tenants
2. Verifying tenant data directories are created
3. Ensuring tenant configuration is properly set
4. Testing tenant deletion and cleanup

### Authentication Context Testing

Verify that JWT tokens contain the correct tenant context:

```javascript
// Test that tokens include tenant information
test('should include tenant context in JWT', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send(credentials)
    .expect(200);
  
  const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
  expect(decoded).toHaveProperty('tenantId', expectedTenantId);
});
```

## Test Coverage Recommendations

To ensure comprehensive testing of the SaaS application, the following areas should be covered:

1. **API Endpoints**: All routes should have integration tests
2. **Business Logic**: All service functions should have unit tests
3. **Middleware**: All middleware should be tested for correct behavior
4. **Error Handling**: Error conditions should be tested
5. **Edge Cases**: Boundary conditions and unusual inputs should be tested
6. **Tenant Isolation**: Cross-tenant data access should be explicitly tested
7. **Data Integrity**: CSV file operations should be tested for consistency

## Testing Environment Setup

### Local Development Environment

1. **Dependencies**: Ensure Node.js is installed (version specified in package.json)
2. **Environment Variables**: Copy `.env.local` to `.env.test` and adjust values for testing
3. **Data Directories**: Ensure test data directories are properly configured
4. **Port Configuration**: Use a different port for test servers to avoid conflicts

### Test Data Preparation

1. **Mock Data Generation**: Create factory functions to generate consistent test data
2. **Test Fixtures**: Prepare reusable data sets for common test scenarios
3. **Data Cleanup**: Implement beforeEach/afterEach hooks to maintain test isolation

### Environment-Specific Configuration

The application uses different configurations for different environments:

- **Development**: Uses `.env.local` configuration
- **Testing**: Should use `.env.test` configuration
- **Production**: Uses environment variables set by deployment platform

Ensure each environment has the correct values for:
- Data directory paths
- JWT secrets
- Port configurations
- Logging levels

## Continuous Integration

For CI/CD pipelines, the following approach is recommended:

```bash
# Install dependencies
npm ci

# Run all tests
npm test

# Generate coverage report
npm run test:coverage
```

## Best Practices

1. **Use Descriptive Test Names**: Test names should clearly describe what is being tested
2. **Test One Thing**: Each test should focus on a single behavior or functionality
3. **Keep Tests Independent**: Tests should not depend on the execution order or state from other tests
4. **Mock External Dependencies**: File I/O and network calls should be mocked
5. **Clean Up Test Data**: Ensure tests don't leave behind artifacts
6. **Use Test Factories**: Create helper functions to generate test data
7. **Test Both Happy and Sad Paths**: Test both successful and error conditions

## Troubleshooting Common Issues

### 1. Tests Failing Due to Data Contamination

Ensure each test uses unique identifiers and that test data is properly cleaned up.

### 2. Authentication Tests Failing

Verify that JWT secrets are properly configured in the test environment.

### 3. CSV File Access Issues

Ensure mock implementations properly simulate file I/O operations.

### 4. Tenant Isolation Failures

Verify that tenant middleware is properly applied and that data operations are scoped correctly.

## Testing Checklist

Use this checklist to ensure all critical areas are tested:

- [ ] Unit tests for all service functions
- [ ] Unit tests for all middleware components
- [ ] Integration tests for all API endpoints
- [ ] Authentication flow testing
- [ ] Tenant isolation verification
- [ ] Cross-tenant data access prevention
- [ ] CSV data integrity under concurrent operations
- [ ] Backup and restore functionality
- [ ] Error handling and edge cases
- [ ] Performance under expected load
- [ ] Data cleanup and test isolation
- [ ] Environment-specific configurations
- [ ] Logging and monitoring capabilities

This checklist helps ensure comprehensive test coverage across all critical aspects of the SaaS application.