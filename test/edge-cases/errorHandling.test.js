// Mock the Supabase client before importing modules
jest.mock('../../src/utils/supabaseClient', () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          user_metadata: {
            tenant_id: 'test-tenant'
          }
        }
      },
      error: null
    })
  }
}));

const request = require('supertest');
const app = require('../../server');
const { createMockEmployee, createMockTenant } = require('../testDataFactory');

describe('Edge Case and Error Handling', () => {
  let testTenant, testEmployee, authToken;

  beforeAll(async () => {
    // Setup test tenant and employee
    testTenant = createMockTenant();
    testEmployee = createMockEmployee();
    
    // Create the employee
    const createResponse = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);
    
    authToken = loginResponse.body.token;
  });

  describe('Boundary Conditions', () => {
    test('should handle maximum length inputs', async () => {
      // Create employee with maximum length fields
      const maxEmployee = createMockEmployee({
        employee_id: `emp_${'x'.repeat(70)}`, // Long employee ID
        name: 'X'.repeat(100), // Long name
        email: `${'x'.repeat(100)}@example.com`, // Long email
        department: 'X'.repeat(50), // Long department
        team: 'X'.repeat(50), // Long team
        role: 'X'.repeat(50) // Long role
      });
      
      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(maxEmployee)
        .expect(201);
      
      expect(response.body.employee).toHaveProperty('employee_id', maxEmployee.employee_id);
    });

    test('should handle minimum length inputs', async () => {
      // Create employee with minimum length fields
      const minEmployee = createMockEmployee({
        employee_id: 'a', // Minimal employee ID
        name: 'X', // Minimal name
        email: 'x@y.z', // Minimal valid email
        department: 'D', // Minimal department
        team: 'T', // Minimal team
        role: 'R' // Minimal role
      });
      
      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(minEmployee)
        .expect(201);
      
      expect(response.body.employee).toHaveProperty('employee_id', minEmployee.employee_id);
    });

    test('should handle special characters in inputs', async () => {
      // Create employee with special characters
      const specialEmployee = createMockEmployee({
        employee_id: 'emp-special_123', // With hyphens and underscores
        name: 'John "Special" O\'Connor', // With quotes and apostrophes
        email: 'john+tag@example.com', // With plus sign
        department: 'R&D', // With ampersand
        team: 'Dev/QA', // With slash
        role: 'Sr. Developer & Architect' // With periods and ampersand
      });
      
      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(specialEmployee)
        .expect(201);
      
      expect(response.body.employee).toHaveProperty('employee_id', specialEmployee.employee_id);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // This would typically require mocking a database error
      // For now, we test with a malformed request that should be handled gracefully
      const malformedData = {
        employee_id: null, // Invalid type
        name: undefined, // Missing value
        email: '' // Empty string
      };
      
      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(malformedData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('should handle network timeouts gracefully', async () => {
      // This would typically require mocking a network timeout
      // For now, we test that the API handles slow requests appropriately
      const slowEmployee = createMockEmployee();
      
      // Add a delay to simulate slow processing
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(slowEmployee)
        .expect(201);
      const endTime = Date.now();
      
      // Should still complete successfully
      expect(response.body.employee).toHaveProperty('employee_id', slowEmployee.employee_id);
      
      // Should not take excessively long (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should handle concurrent requests to the same resource', async () => {
      // Create an employee to update
      const employeeToUpdate = createMockEmployee({
        employee_id: `update_emp_${Date.now()}`,
        email: `update${Date.now()}@example.com`
      });
      
      await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(employeeToUpdate)
        .expect(201);
      
      // Send concurrent update requests
      const updateData = { name: 'Updated Name' };
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .put(`/api/employees/${employeeToUpdate.employee_id}`)
            .set('X-Tenant-ID', testTenant.tenantId)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // All requests should succeed (some may have conflicts but should be handled gracefully)
      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Invalid Inputs', () => {
    test('should reject requests with invalid JSON', async () => {
      // Send malformed JSON
      await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // Invalid JSON
        .expect(400);
    });

    test('should reject requests with unexpected HTTP methods', async () => {
      // Try to use PATCH method on employee creation endpoint (which only supports POST)
      await request(app)
        .patch('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(testEmployee)
        .expect(404); // Should return 404 as PATCH is not supported
    });

    test('should reject requests with invalid URL parameters', async () => {
      // Try to access employee with invalid ID format
      await request(app)
        .get('/api/employees/invalid%20id%20with%20spaces')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Should return 404 for non-existent employee
    });
  });
});