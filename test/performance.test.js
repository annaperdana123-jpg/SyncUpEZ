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
const app = require('../server');
const { createMockEmployee, createMockTenant, createMockInteraction, createMockKudos } = require('./testDataFactory');

describe('Performance Tests', () => {
  let testTenant, testEmployee, authToken;

  beforeAll(async () => {
    // Create mock tenant and employee
    testTenant = createMockTenant();
    testEmployee = createMockEmployee();

    // Mock the Supabase chain for employee creation
    const selectMock = jest.fn().mockResolvedValueOnce({ 
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
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

    // Create the employee
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);

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
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);

    authToken = 'valid-token';
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
      
      // Mock the Supabase chain for each employee creation
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: `uuid-${i}`,
          tenant_id: testTenant.tenantId,
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
          // Mock the Supabase chain for getting employees
          const rangeMock = jest.fn().mockResolvedValueOnce({ 
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
            error: null,
            count: 1
          });
          const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
          const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
          const fromMock = jest.fn().mockReturnValue({ select: selectMock });
          
          require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
          
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
          
          // Mock the Supabase chain for interaction creation
          const selectMock1 = jest.fn().mockResolvedValueOnce({ 
            data: [{ 
              id: `interaction-${i}`,
              tenant_id: testTenant.tenantId,
              employee_id: interaction.employee_id,
              type: interaction.type,
              content: interaction.content
            }], 
            error: null 
          });
          const insertMock1 = jest.fn().mockReturnValue({ select: selectMock1 });
          const fromMock1 = jest.fn().mockReturnValue({ insert: insertMock1 });
          
          require('../src/utils/supabaseClient').from.mockImplementation(fromMock1);
          
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
          
          // Mock the Supabase chain for kudos creation
          const selectMock2 = jest.fn().mockResolvedValueOnce({ 
            data: [{ 
              id: `kudos-${i}`,
              tenant_id: testTenant.tenantId,
              from_employee_id: kudos.from_employee_id,
              to_employee_id: kudos.to_employee_id,
              message: kudos.message
            }], 
            error: null 
          });
          const insertMock2 = jest.fn().mockReturnValue({ select: selectMock2 });
          const fromMock2 = jest.fn().mockReturnValue({ insert: insertMock2 });
          
          require('../src/utils/supabaseClient').from.mockImplementation(fromMock2);
          
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
          // Mock the Supabase chain for getting analytics
          const rpcMock = jest.fn().mockResolvedValueOnce({ 
            data: { 
              total_employees: 10,
              total_interactions: 50,
              total_kudos: 20,
              average_contribution_score: 75
            }, 
            error: null 
          });
          
          require('../src/utils/supabaseClient').rpc.mockImplementation(rpcMock);
          
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
      
      // Mock the Supabase chain for each employee creation
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: `uuid-${i}`,
          tenant_id: testTenant.tenantId,
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
    
    // Mock the Supabase chain for getting employees
    const employeesData = bulkEmployees.map((emp, i) => ({
      id: `uuid-${i}`,
      tenant_id: testTenant.tenantId,
      employee_id: emp.employee_id,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      team: emp.team,
      role: emp.role
    }));
    
    const rangeMock = jest.fn().mockResolvedValueOnce({ 
      data: employeesData, 
      error: null,
      count: employeesData.length
    });
    const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
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
      // Mock the Supabase chain for getting employees
      const rangeMock = jest.fn().mockResolvedValueOnce({ 
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
        error: null,
        count: 1
      });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const startTime = Date.now();
      
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .expect(200);
      
      const endTime = Date.now();
      responseTimes.push(endTime - startTime);
    }
    
    // Calculate statistics
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    // Log performance metrics
    console.log(`Sequential requests performance:`);
    console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Max response time: ${maxResponseTime}ms`);
    console.log(`  Min response time: ${minResponseTime}ms`);
    
    // Ensure consistent performance (average < 200ms, max < 500ms)
    expect(avgResponseTime).toBeLessThan(200);
    expect(maxResponseTime).toBeLessThan(500);
  }, 15000); // 15 second timeout
});