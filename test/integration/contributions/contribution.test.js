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

const { createMockEmployee, createMockContribution, createMockTenant } = require('../../testDataFactory');

describe('Contribution API', () => {
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

  describe('POST /api/contributions', () => {
    test('should add contribution scores', async () => {
      const mockContribution = createMockContribution({
        employee_id: createdEmployeeId
      });
      
      // Mock the Supabase chain for contribution creation
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-456',
          tenant_id: testTenant.tenantId,
          employee_id: mockContribution.employee_id,
          calculated_at: '2023-01-01T10:00:00Z',
          problem_solving_score: mockContribution.problem_solving_score,
          collaboration_score: mockContribution.collaboration_score,
          initiative_score: mockContribution.initiative_score,
          overall_score: mockContribution.overall_score
        }], 
        error: null 
      });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .post('/api/contributions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockContribution)
        .expect(201);
      
      expect(response.body).toHaveProperty('message', 'Contribution scores added successfully');
      expect(response.body.contribution).toHaveProperty('employee_id', createdEmployeeId);
      expect(response.body.contribution).toHaveProperty('problem_solving_score', mockContribution.problem_solving_score);
      expect(response.body.contribution).toHaveProperty('overall_score');
    });

    test('should return 400 for invalid contribution data', async () => {
      const invalidContribution = {
        problem_solving_score: 80
        // Missing required employee_id
      };
      
      await request(app)
        .post('/api/contributions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidContribution)
        .expect(400);
    });
  });

  describe('GET /api/contributions', () => {
    test('should get all contributions', async () => {
      // Mock the Supabase chain for getting contributions
      const rangeMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-456',
          tenant_id: testTenant.tenantId,
          employee_id: createdEmployeeId,
          calculated_at: '2023-01-01T10:00:00Z',
          problem_solving_score: 80,
          collaboration_score: 75,
          initiative_score: 85,
          overall_score: 80
        }], 
        error: null,
        count: 1
      });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get('/api/contributions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should handle pagination parameters', async () => {
      // Mock the Supabase chain for getting contributions with pagination
      const rangeMock = jest.fn().mockResolvedValueOnce({ 
        data: [], 
        error: null,
        count: 0
      });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get('/api/contributions?page=2&limit=5')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 2);
      expect(response.body.pagination).toHaveProperty('limit', 5);
    });

    test('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/contributions')
        .set('X-Tenant-ID', testTenant.tenantId)
        // No auth token
        .expect(401);
    });
  });

  describe('GET /api/contributions/employee/:id', () => {
    test('should get contributions for a specific employee', async () => {
      // Mock the Supabase chain for getting contributions by employee ID
      const eq2Mock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-456',
          tenant_id: testTenant.tenantId,
          employee_id: createdEmployeeId,
          calculated_at: '2023-01-01T10:00:00Z',
          problem_solving_score: 80,
          collaboration_score: 75,
          initiative_score: 85,
          overall_score: 80
        }], 
        error: null 
      });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get(`/api/contributions/employee/${createdEmployeeId}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('employee_id', createdEmployeeId);
    });
  });
});