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

// Removed bcrypt mock as it's no longer needed

// Reset modules to ensure the mock is applied before the app is imported
jest.resetModules();

const request = require('supertest');
let app;

// Import the app after mocks are set up
beforeAll(() => {
  app = require('../../../server');
});

const { createMockEmployee, createMockTenant } = require('../../testDataFactory');

describe('Authentication API', () => {
  let testTenant, testEmployee, createdEmployeeId, authToken;

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
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
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
          // Removed password field as it's no longer stored
        }, 
        error: null 
      });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send({
          email: testEmployee.email,
          password: testEmployee.password // This is handled by Supabase Auth
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('employee');
      authToken = response.body.token;
    });

    test('should return 401 with invalid credentials', async () => {
      // Mock the Supabase chain for login with invalid credentials
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
        .post('/api/auth/login')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send({
          email: testEmployee.email,
          password: 'wrong-password'
        })
        .expect(401);
    });

    test('should return 400 with missing credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send({
          email: testEmployee.email
          // missing password
        })
        .expect(400);
    });
  });

  describe('Authentication Protection', () => {
    test('should reject requests without valid token', async () => {
      await request(app)
        .get('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        // No Authorization header
        .expect(401);
    });

    test('should allow requests with valid token', async () => {
      // First login to get a valid token
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
          // Removed password field as it's no longer stored
        }, 
        error: null 
      });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send({
          email: testEmployee.email,
          password: testEmployee.password
        })
        .expect(200);
      
      const validToken = loginResponse.body.token;
      
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
      const selectMock2 = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock2 = jest.fn().mockReturnValue({ select: selectMock2 });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock2);
      
      await request(app)
        .get('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });
  });
});