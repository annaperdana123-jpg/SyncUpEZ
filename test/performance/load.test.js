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
const { createMockEmployee, createMockTenant, createMockInteraction, createMockKudos } = require('../testDataFactory');

describe('Performance Tests', () => {
  let testTenant, testEmployee, authToken;

  beforeAll(async () => {
    // Create mock tenant and employee
    testTenant = createMockTenant();
    testEmployee = createMockEmployee();

    // Create the employee
    await request(app)
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

  test('should handle concurrent employee creation requests', async () => {
    const startTime = Date.now();
    const concurrentRequests = 20;
    const promises = [];

    // Create multiple employees concurrently
    for (let i = 0; i < concurrentRequests; i++) {
      const employee = createMockEmployee({
        employee_id: `perf_emp_${i}_${Date.now()}`,
        email: `perf${i}_${Date.now()}@example.com`
      });
      
      promises.push(
        request(app)
          .post('/api/employees')
          .set('X-Tenant-ID', testTenant.tenantId)
          .send(employee)
      );
    }

    // Execute all requests
    const responses = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all requests were successful
    const successfulResponses = responses.filter(res => res.status === 201);
    expect(successfulResponses).toHaveLength(concurrentRequests);

    // Log performance metrics
    console.log(`Concurrent employee creation: ${concurrentRequests} requests completed in ${duration}ms`);
    console.log(`Average response time: ${duration / concurrentRequests}ms per request`);
    
    // Ensure reasonable performance (less than 5 seconds for 20 requests)
    expect(duration).toBeLessThan(5000);
  }, 10000); // 10 second timeout

  test('should handle concurrent API requests efficiently', async () => {
    const startTime = Date.now();
    const concurrentRequests = 30;
    const promises = [];

    // Mix of different API requests
    for (let i = 0; i < concurrentRequests; i++) {
      switch (i % 4) {
        case 0:
          // Employee list request
          promises.push(
            request(app)
              .get('/api/employees')
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Tenant-ID', testTenant.tenantId)
          );
          break;
        case 1:
          // Create interaction
          const interaction = createMockInteraction({
            employee_id: testEmployee.employee_id
          });
          promises.push(
            request(app)
              .post('/api/interactions')
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Tenant-ID', testTenant.tenantId)
              .send(interaction)
          );
          break;
        case 2:
          // Create kudos
          const kudos = createMockKudos({
            from_employee_id: testEmployee.employee_id,
            to_employee_id: testEmployee.employee_id
          });
          promises.push(
            request(app)
              .post('/api/kudos')
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Tenant-ID', testTenant.tenantId)
              .send(kudos)
          );
          break;
        case 3:
          // Analytics request
          promises.push(
            request(app)
              .get('/api/analytics/stats')
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Tenant-ID', testTenant.tenantId)
          );
          break;
      }
    }

    // Execute all requests
    const responses = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all requests were successful (expecting mostly 200s, some 201s)
    const successfulResponses = responses.filter(res => res.status === 200 || res.status === 201);
    expect(successfulResponses.length).toBeGreaterThan(concurrentRequests * 0.9); // Allow 10% failure rate

    // Log performance metrics
    console.log(`Concurrent mixed API requests: ${concurrentRequests} requests completed in ${duration}ms`);
    console.log(`Average response time: ${duration / concurrentRequests}ms per request`);
    
    // Ensure reasonable performance (less than 8 seconds for 30 requests)
    expect(duration).toBeLessThan(8000);
  }, 15000); // 15 second timeout

  test('should handle large data set requests efficiently', async () => {
    // Create a larger data set first
    const bulkEmployees = [];
    const creationPromises = [];
    
    // Create 50 employees
    for (let i = 0; i < 50; i++) {
      const employee = createMockEmployee({
        employee_id: `bulk_emp_${i}_${Date.now()}`,
        email: `bulk${i}_${Date.now()}@example.com`
      });
      bulkEmployees.push(employee);
      
      creationPromises.push(
        request(app)
          .post('/api/employees')
          .set('X-Tenant-ID', testTenant.tenantId)
          .send(employee)
      );
    }
    
    // Execute all creation requests
    await Promise.all(creationPromises);
    
    // Now test retrieving the large data set
    const startTime = Date.now();
    
    const response = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.tenantId)
      .expect(200);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verify we got the expected number of employees
    expect(response.body.data.length).toBeGreaterThanOrEqual(50);
    
    // Log performance metrics
    console.log(`Large data set retrieval: ${response.body.data.length} employees retrieved in ${duration}ms`);
    
    // Ensure reasonable performance (less than 2 seconds for 50+ employees)
    expect(duration).toBeLessThan(2000);
  }, 20000); // 20 second timeout

  test('should maintain consistent response times under load', async () => {
    const responseTimes = [];
    
    // Make 50 sequential requests and measure response times
    for (let i = 0; i < 50; i++) {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .expect(200);
      
      const endTime = Date.now();
      responseTimes.push(endTime - startTime);
    }
    
    // Calculate average response time
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    // Log performance metrics
    console.log(`Sequential requests: Average response time: ${averageResponseTime}ms`);
    
    // Ensure consistent performance (average less than 100ms)
    expect(averageResponseTime).toBeLessThan(100);
  }, 10000); // 10 second timeout
});