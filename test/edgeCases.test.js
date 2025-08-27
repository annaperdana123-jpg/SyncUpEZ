// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

// Mock the Supabase client before importing modules
jest.mock('../src/utils/supabaseClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    signInWithPassword: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          user_metadata: {
            tenant_id: 'test-tenant'
          }
        },
        session: {
          access_token: 'test-access-token'
        }
      },
      error: null
    })
  }
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');
const { createMockEmployee, createMockTenant } = require('./testDataFactory');

describe('Edge Case and Error Handling Tests', () => {
  let testTenant, testEmployee;

  beforeAll(() => {
    // Create mock tenant and employee
    testTenant = createMockTenant();
    testEmployee = createMockEmployee();
  });

  test('should handle missing required fields in employee creation', async () => {
    // Try to create an employee with missing required fields
    const invalidEmployee = {
      name: 'Test User'
      // Missing employee_id, email, password
    };

    const response = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(invalidEmployee)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle invalid email format', async () => {
    const invalidEmployee = createMockEmployee({
      email: 'invalid-email-format'
    });

    const response = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(invalidEmployee)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle duplicate employee creation', async () => {
    // Mock the Supabase chain for first employee creation
    const selectMock1 = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-123',
        tenant_id: testTenant.tenantId,
        employee_id: testEmployee.employee_id,
        name: testEmployee.name,
        email: testEmployee.email,
        department: testEmployee.department,
        team: testEmployee.team,
        role: testEmployee.role
      }], 
      error: null 
    });
    const insertMock1 = jest.fn().mockReturnValue({ select: selectMock1 });
    const fromMock1 = jest.fn().mockReturnValue({ insert: insertMock1 });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock1);
    
    // Create the first employee
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);

    // Mock the Supabase chain to simulate duplicate employee error
    const insertMock2 = jest.fn().mockReturnValue({ 
      select: jest.fn().mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'duplicate key value violates unique constraint' } 
      }) 
    });
    const fromMock2 = jest.fn().mockReturnValue({ insert: insertMock2 });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock2);
    
    // Try to create the same employee again
    const response = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle login with non-existent user', async () => {
    // Mock the Supabase auth to simulate user not found
    require('../src/utils/supabaseClient').auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: null
      },
      error: { message: 'Invalid login credentials' }
    });
    
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: 'nonexistent@example.com',
        password: 'password123'
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle login with invalid password', async () => {
    // Mock the Supabase auth to simulate invalid password
    require('../src/utils/supabaseClient').auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: null
      },
      error: { message: 'Invalid login credentials' }
    });
    
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle requests with missing authentication token', async () => {
    const response = await request(app)
      .get('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      // No Authorization header
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle requests with invalid authentication token', async () => {
    // Mock the Supabase auth to simulate invalid token
    require('../src/utils/supabaseClient').auth.getUser.mockResolvedValueOnce({
      data: {
        user: null
      },
      error: { message: 'Invalid token' }
    });
    
    const response = await request(app)
      .get('/api/employees')
      .set('Authorization', 'Bearer invalid-token')
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle requests for non-existent resources', async () => {
    // Mock the Supabase auth for login
    require('../src/utils/supabaseClient').auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-id',
          email: testEmployee.email,
          user_metadata: {
            tenant_id: testTenant.tenantId
          }
        },
        session: {
          access_token: 'valid-token'
        }
      },
      error: null
    });
    
    // Login to get a valid token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);

    const token = 'valid-token';

    // Mock the Supabase chain to simulate employee not found
    const singleMock = jest.fn().mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Employee not found' } 
    });
    const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    // Try to get a non-existent employee
    const response = await request(app)
      .get('/api/employees/nonexistent_employee_id')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle malformed JSON in request body', async () => {
    const response = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}') // Malformed JSON
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle empty request body', async () => {
    const response = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({}) // Empty body
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle tenant with special characters in ID', async () => {
    const specialCharTenant = createMockTenant({
      tenantId: 'tenant-with-special-chars_123'
    });

    const employee = createMockEmployee();

    // Mock the Supabase chain for employee creation
    const selectMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-124',
        tenant_id: specialCharTenant.tenantId,
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        team: employee.team,
        role: employee.role
      }], 
      error: null 
    });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    // Create employee in tenant with special characters
    const response = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', specialCharTenant.tenantId)
      .send(employee)
      .expect(201);

    expect(response.body.employee).toHaveProperty('employee_id', employee.employee_id);
  });

  test('should handle very long input values', async () => {
    const longEmployee = createMockEmployee({
      name: 'A'.repeat(1000), // Very long name
      email: `${'a'.repeat(200)}@example.com` // Very long email prefix
    });

    const response = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(longEmployee)
      .expect(400); // Should fail validation

    expect(response.body).toHaveProperty('error');
  });

  test('should handle concurrent duplicate requests', async () => {
    const employee = createMockEmployee();
    
    // Counter to track how many times the insert mock is called
    let callCount = 0;
    
    // Mock the Supabase chain for employee creation with conditional responses
    const insertMock = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call succeeds
        return {
          select: jest.fn().mockResolvedValueOnce({ 
            data: [{ 
              id: 'uuid-' + callCount,
              tenant_id: testTenant.tenantId,
              employee_id: employee.employee_id,
              name: employee.name,
              email: employee.email,
              department: employee.department,
              team: employee.team,
              role: employee.role
            }], 
            error: null 
          })
        };
      } else {
        // Subsequent calls fail with duplicate error
        return {
          select: jest.fn().mockResolvedValueOnce({ 
            data: null, 
            error: { message: 'duplicate key value violates unique constraint' } 
          })
        };
      }
    });
    
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

    // Send multiple identical requests concurrently
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post('/api/employees')
          .set('X-Tenant-ID', testTenant.tenantId)
          .send(employee)
      );
    }

    const responses = await Promise.all(promises);

    // Count successful and failed responses
    const successful = responses.filter(res => res.status === 201).length;
    const failed = responses.filter(res => res.status === 400 || res.status === 500).length;

    // Exactly one should succeed, others should fail
    expect(successful).toBe(1);
    expect(failed).toBe(4);
  });
});