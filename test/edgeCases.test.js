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
    // Create the first employee
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);

    // Try to create the same employee again
    const response = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle login with non-existent user', async () => {
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
    const response = await request(app)
      .get('/api/employees')
      .set('Authorization', 'Bearer invalid-token')
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  test('should handle requests for non-existent resources', async () => {
    // Login to get a valid token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);

    const token = loginResponse.body.token;

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
    const failed = responses.filter(res => res.status === 400).length;

    // Exactly one should succeed, others should fail
    expect(successful).toBe(1);
    expect(failed).toBe(4);
  });
});