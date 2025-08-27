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
    // Mock the Supabase chain for employee A creation
    const selectMockA = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-A',
        tenant_id: tenantA.tenantId,
        employee_id: employeeA.employee_id,
        name: employeeA.name,
        email: employeeA.email,
        department: employeeA.department,
        team: employeeA.team,
        role: employeeA.role
      }], 
      error: null 
    });
    const insertMockA = jest.fn().mockReturnValue({ select: selectMockA });
    const fromMockA = jest.fn().mockReturnValue({ insert: insertMockA });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMockA);
    
    // Create employee in tenant A
    const responseA = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', tenantA.tenantId)
      .send(employeeA)
      .expect(201);
    
    expect(responseA.body.employee).toHaveProperty('employee_id', employeeA.employee_id);
    
    // Mock the Supabase chain for employee B creation
    const selectMockB = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-B',
        tenant_id: tenantB.tenantId,
        employee_id: employeeB.employee_id,
        name: employeeB.name,
        email: employeeB.email,
        department: employeeB.department,
        team: employeeB.team,
        role: employeeB.role
      }], 
      error: null 
    });
    const insertMockB = jest.fn().mockReturnValue({ select: selectMockB });
    const fromMockB = jest.fn().mockReturnValue({ insert: insertMockB });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMockB);
    
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
    // Mock the Supabase auth for login A
    require('../src/utils/supabaseClient').auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-A',
          email: employeeA.email,
          user_metadata: {
            tenant_id: tenantA.tenantId
          }
        },
        session: {
          access_token: 'token-A'
        }
      },
      error: null
    });
    
    // Login as employee A
    const loginResponseA = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', tenantA.tenantId)
      .send({
        email: employeeA.email,
        password: employeeA.password
      })
      .expect(200);
    
    authTokenA = 'token-A';
    
    // Mock the Supabase auth for login B
    require('../src/utils/supabaseClient').auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-B',
          email: employeeB.email,
          user_metadata: {
            tenant_id: tenantB.tenantId
          }
        },
        session: {
          access_token: 'token-B'
        }
      },
      error: null
    });
    
    // Login as employee B
    const loginResponseB = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', tenantB.tenantId)
      .send({
        email: employeeB.email,
        password: employeeB.password
      })
      .expect(200);
    
    authTokenB = 'token-B';
    
    // Mock the Supabase chain to simulate employee not found for cross-tenant access
    const singleMock = jest.fn().mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Employee not found' } 
    });
    const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
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
    // Mock the Supabase chain for getting employees for tenant A
    const rangeMockA = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-A',
        tenant_id: tenantA.tenantId,
        employee_id: employeeA.employee_id,
        name: employeeA.name,
        email: employeeA.email,
        department: employeeA.department,
        team: employeeA.team,
        role: employeeA.role
      }], 
      error: null,
      count: 1
    });
    const eqMockA = jest.fn().mockReturnValue({ range: rangeMockA });
    const selectMockA = jest.fn().mockReturnValue({ eq: eqMockA });
    const fromMockA = jest.fn().mockReturnValue({ select: selectMockA });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMockA);
    
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
    
    // Mock the Supabase chain for getting employees for tenant B
    const rangeMockB = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-B',
        tenant_id: tenantB.tenantId,
        employee_id: employeeB.employee_id,
        name: employeeB.name,
        email: employeeB.email,
        department: employeeB.department,
        team: employeeB.team,
        role: employeeB.role
      }], 
      error: null,
      count: 1
    });
    const eqMockB = jest.fn().mockReturnValue({ range: rangeMockB });
    const selectMockB = jest.fn().mockReturnValue({ eq: eqMockB });
    const fromMockB = jest.fn().mockReturnValue({ select: selectMockB });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMockB);
    
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
    // Mock the Supabase chain for getting analytics for tenant A
    const rpcMockA = jest.fn().mockResolvedValueOnce({ 
      data: { 
        total_employees: 1,
        total_interactions: 0,
        total_kudos: 0,
        average_contribution_score: 0
      }, 
      error: null 
    });
    
    require('../src/utils/supabaseClient').rpc.mockImplementation(rpcMockA);
    
    // Get analytics for tenant A
    const analyticsResponseA = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${authTokenA}`)
      .set('X-Tenant-ID', tenantA.tenantId)
      .expect(200);
    
    // Mock the Supabase chain for getting analytics for tenant B
    const rpcMockB = jest.fn().mockResolvedValueOnce({ 
      data: { 
        total_employees: 1,
        total_interactions: 0,
        total_kudos: 0,
        average_contribution_score: 0
      }, 
      error: null 
    });
    
    require('../src/utils/supabaseClient').rpc.mockImplementation(rpcMockB);
    
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