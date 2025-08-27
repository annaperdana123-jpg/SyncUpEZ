// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

// Mock the Supabase client before importing modules
jest.mock('../../../src/utils/supabaseClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
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

// Mock bcrypt to avoid actual password hashing
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Reset modules to ensure the mock is applied before the app is imported
jest.resetModules();

const request = require('supertest');
let app;

// Import the app after mocks are set up
beforeAll(() => {
  app = require('../../../server');
});

const { createMockEmployee, createMockTenant } = require('../../testDataFactory');

describe('Analytics API', () => {
  let testTenant, testEmployee, authToken, createdEmployeeId;

  beforeAll(async () => {
    // Setup test tenant and employee
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
    
    require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    // Create the employee
    const createResponse = await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);
    
    createdEmployeeId = createResponse.body.employee.employee_id;
    
    // Mock the Supabase chain for login
    const singleMock = jest.fn().mockResolvedValueOnce({ 
      data: { 
        id: 'uuid-123',
        tenant_id: testTenant.tenantId,
        employee_id: testEmployee.employee_id,
        name: testEmployee.name,
        email: testEmployee.email,
        department: testEmployee.department,
        team: testEmployee.team,
        role: testEmployee.role
      }, 
      error: null 
    });
    const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock2 = jest.fn().mockReturnValue({ eq: eq1Mock });
    const fromMock2 = jest.fn().mockReturnValue({ select: selectMock2 });
    
    require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock2);
    
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

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/employees/:id', () => {
    test('should get employee analytics', async () => {
      // Mock the Supabase chain for getting employee analytics
      // Mock employee data
      const singleMock = jest.fn().mockResolvedValueOnce({ 
        data: { 
          id: 'uuid-123',
          tenant_id: testTenant.tenantId,
          employee_id: testEmployee.employee_id,
          name: testEmployee.name,
          email: testEmployee.email,
          department: testEmployee.department,
          team: testEmployee.team,
          role: testEmployee.role
        }, 
        error: null 
      });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get(`/api/analytics/employees/${createdEmployeeId}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('employee_id', createdEmployeeId);
      expect(response.body).toHaveProperty('name', testEmployee.name);
      expect(response.body).toHaveProperty('department', testEmployee.department);
      expect(response.body).toHaveProperty('team', testEmployee.team);
    });

    test('should return 404 for non-existent employee', async () => {
      // Mock the Supabase chain to simulate employee not found
      const singleMock = jest.fn().mockResolvedValueOnce({ 
        data: null,
        error: { message: 'Employee not found' }
      });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      await request(app)
        .get('/api/analytics/employees/non-existent-id')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/analytics/employees/${createdEmployeeId}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        // No auth token
        .expect(401);
    });
  });

  describe('GET /api/analytics/stats', () => {
    test('should get overall stats', async () => {
      // Mock the Supabase chain for getting overall stats
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
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get('/api/analytics/stats')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('total_employees');
      expect(response.body).toHaveProperty('departments');
      expect(response.body).toHaveProperty('teams');
      expect(typeof response.body.total_employees).toBe('number');
    });

    test('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/analytics/stats')
        .set('X-Tenant-ID', testTenant.tenantId)
        // No auth token
        .expect(401);
    });
  });
});