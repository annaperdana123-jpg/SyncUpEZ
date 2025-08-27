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

describe('Authorization Security', () => {
  let tenantA, tenantB;
  let employeeA, employeeB;
  let authTokenA, authTokenB;

  beforeAll(async () => {
    // Create mock tenants
    tenantA = createMockTenant({ tenantId: 'tenantA' });
    tenantB = createMockTenant({ tenantId: 'tenantB' });
    
    // Create mock employees for each tenant
    employeeA = createMockEmployee({ 
      employee_id: `empA_${Date.now()}`,
      email: `empA${Date.now()}@example.com`
    });
    
    employeeB = createMockEmployee({ 
      employee_id: `empB_${Date.now()}`,
      email: `empB${Date.now()}@example.com`
    });
    
    // Create employees in their respective tenants
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', tenantA.tenantId)
      .send(employeeA)
      .expect(201);
    
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', tenantB.tenantId)
      .send(employeeB)
      .expect(201);
    
    // Login to get auth tokens
    const loginResponseA = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', tenantA.tenantId)
      .send({
        email: employeeA.email,
        password: employeeA.password
      })
      .expect(200);
    
    authTokenA = loginResponseA.body.token;
    
    const loginResponseB = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', tenantB.tenantId)
      .send({
        email: employeeB.email,
        password: employeeB.password
      })
      .expect(200);
    
    authTokenB = loginResponseB.body.token;
  });

  describe('Tenant Data Isolation', () => {
    test('should prevent access to other tenant data', async () => {
      // Try to access tenant B's employee data using tenant A's token
      await request(app)
        .get(`/api/employees/${employeeB.employee_id}`)
        .set('Authorization', `Bearer ${authTokenA}`)
        .set('X-Tenant-ID', tenantA.tenantId)
        .expect(404); // Should not find the employee (not 403 or 200)
      
      // Try to access tenant A's employee data using tenant B's token
      await request(app)
        .get(`/api/employees/${employeeA.employee_id}`)
        .set('Authorization', `Bearer ${authTokenB}`)
        .set('X-Tenant-ID', tenantB.tenantId)
        .expect(404); // Should not find the employee (not 403 or 200)
    });

    test('should reject access with tenant mismatch in headers', async () => {
      // Try to use tenant A's token with tenant B's header
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authTokenA}`)
        .set('X-Tenant-ID', tenantB.tenantId)
        .expect(403); // Should be forbidden due to tenant mismatch
      
      // Try to use tenant B's token with tenant A's header
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authTokenB}`)
        .set('X-Tenant-ID', tenantA.tenantId)
        .expect(403); // Should be forbidden due to tenant mismatch
    });
  });

  describe('Role-Based Access Control', () => {
    test('should allow regular users to access their own data', async () => {
      // Employee A should be able to access their own data
      await request(app)
        .get(`/api/employees/${employeeA.employee_id}`)
        .set('Authorization', `Bearer ${authTokenA}`)
        .set('X-Tenant-ID', tenantA.tenantId)
        .expect(200);
    });

    test('should prevent regular users from accessing admin endpoints', async () => {
      // Regular users should not be able to access tenant management endpoints
      await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${authTokenA}`)
        .set('X-Tenant-ID', tenantA.tenantId)
        .send(createMockTenant())
        .expect(403); // Forbidden - regular users can't create tenants
    });
  });

  describe('Proper Error Responses', () => {
    test('should return 401 for unauthorized access', async () => {
      // No authorization token provided
      await request(app)
        .get('/api/employees')
        .set('X-Tenant-ID', tenantA.tenantId)
        .expect(401);
    });

    test('should return 403 for forbidden access', async () => {
      // Correct token but trying to access admin functionality
      await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${authTokenA}`)
        .set('X-Tenant-ID', tenantA.tenantId)
        .send(createMockTenant())
        .expect(403);
    });

    test('should return 404 for non-existent resources (not 403)', async () => {
      // Trying to access non-existent employee (should not reveal if it exists in another tenant)
      await request(app)
        .get('/api/employees/non-existent-id')
        .set('Authorization', `Bearer ${authTokenA}`)
        .set('X-Tenant-ID', tenantA.tenantId)
        .expect(404);
    });
  });
});