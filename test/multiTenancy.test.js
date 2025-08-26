const request = require('supertest');
const app = require('../server');
const { createMockEmployee, createMockTenant } = require('./testDataFactory');

describe('Multi-Tenancy Tests', () => {
  let tenantA, tenantB;
  let employeeA, employeeB;
  let authTokenA, authTokenB;

  beforeAll(() => {
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
  });

  // Test tenant isolation for employee creation
  test('should create employees in separate tenant contexts', async () => {
    // Create employee in tenant A
    const responseA = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', tenantA.tenantId)
      .send(employeeA)
      .expect(201);
    
    expect(responseA.body.employee).toHaveProperty('employee_id', employeeA.employee_id);
    
    // Create employee in tenant B
    const responseB = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', tenantB.tenantId)
      .send(employeeB)
      .expect(201);
    
    expect(responseB.body.employee).toHaveProperty('employee_id', employeeB.employee_id);
  });

  // Test that Tenant A cannot access Tenant B's data
  test('should prevent cross-tenant data access', async () => {
    // Login as employee A
    const loginResponseA = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', tenantA.tenantId)
      .send({
        email: employeeA.email,
        password: employeeA.password
      })
      .expect(200);
    
    authTokenA = loginResponseA.body.token;
    
    // Login as employee B
    const loginResponseB = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', tenantB.tenantId)
      .send({
        email: employeeB.email,
        password: employeeB.password
      })
      .expect(200);
    
    authTokenB = loginResponseB.body.token;
    
    // Try to access tenant B's employee from tenant A context (should fail)
    await request(app)
      .get(`/api/employees/${employeeB.employee_id}`)
      .set('Authorization', `Bearer ${authTokenA}`)
      .set('X-Tenant-ID', tenantA.tenantId)
      .expect(404);
    
    // Try to access tenant A's employee from tenant B context (should fail)
    await request(app)
      .get(`/api/employees/${employeeA.employee_id}`)
      .set('Authorization', `Bearer ${authTokenB}`)
      .set('X-Tenant-ID', tenantB.tenantId)
      .expect(404);
  });

  // Test that each tenant can only see their own data
  test('should ensure tenants can only see their own data', async () => {
    // Get all employees for tenant A
    const employeesResponseA = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${authTokenA}`)
      .set('X-Tenant-ID', tenantA.tenantId)
      .expect(200);
    
    // Verify that tenant A only sees their own employee
    const tenantAEmployees = employeesResponseA.body.data;
    expect(tenantAEmployees).toHaveLength(1);
    expect(tenantAEmployees[0]).toHaveProperty('employee_id', employeeA.employee_id);
    
    // Get all employees for tenant B
    const employeesResponseB = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${authTokenB}`)
      .set('X-Tenant-ID', tenantB.tenantId)
      .expect(200);
    
    // Verify that tenant B only sees their own employee
    const tenantBEmployees = employeesResponseB.body.data;
    expect(tenantBEmployees).toHaveLength(1);
    expect(tenantBEmployees[0]).toHaveProperty('employee_id', employeeB.employee_id);
  });

  // Test tenant-specific analytics
  test('should provide tenant-specific analytics', async () => {
    // Get analytics for tenant A
    const analyticsResponseA = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${authTokenA}`)
      .set('X-Tenant-ID', tenantA.tenantId)
      .expect(200);
    
    // Get analytics for tenant B
    const analyticsResponseB = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${authTokenB}`)
      .set('X-Tenant-ID', tenantB.tenantId)
      .expect(200);
    
    // Verify that analytics are different for each tenant
    expect(analyticsResponseA.body.total_employees).toBe(1);
    expect(analyticsResponseB.body.total_employees).toBe(1);
  });
});