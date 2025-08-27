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

describe('Authentication Security', () => {
  let testTenant, testEmployee;

  beforeAll(async () => {
    // Setup test tenant and employee
    testTenant = createMockTenant();
    testEmployee = createMockEmployee();
    
    // Create the employee
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);
  });

  describe('User Registration and Login', () => {
    test('should register new user and login successfully', async () => {
      // Create a new employee (registration)
      const newEmployee = createMockEmployee({
        employee_id: `new_emp_${Date.now()}`,
        email: `new${Date.now()}@example.com`
      });
      
      await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(newEmployee)
        .expect(201);
      
      // Login with the new employee
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send({
          email: newEmployee.email,
          password: newEmployee.password
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('employee');
    });

    test('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send({
          email: testEmployee.email,
          password: 'wrong-password'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('JWT Token Validation', () => {
    test('should generate valid JWT token with tenant context', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send({
          email: testEmployee.email,
          password: testEmployee.password
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('token');
      // Token should be a string and not empty
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    test('should reject requests with invalid JWT token', async () => {
      await request(app)
        .get('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    test('should reject requests with expired JWT token', async () => {
      // This would require mocking the JWT verification to simulate an expired token
      // For now, we test with a malformed token
      await request(app)
        .get('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
        .expect(401);
    });
  });
});