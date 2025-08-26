const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { createMockEmployee, createMockTenant } = require('./testDataFactory');

describe('Authentication Context Tests', () => {
  let testTenant, testEmployee;

  beforeAll(() => {
    // Create mock tenant and employee
    testTenant = createMockTenant({ tenantId: 'auth_test_tenant' });
    testEmployee = createMockEmployee();
  });

  test('should include tenant context in JWT token', async () => {
    // Create an employee first
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);

    // Login to get the token
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);

    // Verify the response contains a token
    expect(response.body).toHaveProperty('token');
    
    // Decode the JWT token
    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'default_secret');
    
    // Verify the token includes tenant information
    expect(decoded).toHaveProperty('tenantId', testTenant.tenantId);
    expect(decoded).toHaveProperty('employee_id', testEmployee.employee_id);
    expect(decoded).toHaveProperty('email', testEmployee.email);
  });

  test('should authenticate with correct tenant context', async () => {
    // Login to get the token
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);

    // Use the token to access a protected route
    const protectedResponse = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${response.body.token}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(200);

    // Verify we get data back
    expect(protectedResponse.body).toHaveProperty('data');
    expect(Array.isArray(protectedResponse.body.data)).toBe(true);
  });

  test('should reject tokens with mismatched tenant context', async () => {
    // Login to get the token
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);

    // Try to use the token with a different tenant context
    await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${response.body.token}`)
      .set('X-Tenant-ID', 'different_tenant')
      .expect(401);
  });
});