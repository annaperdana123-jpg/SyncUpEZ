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
  rpc: jest.fn().mockResolvedValue({ data: null, error: null })
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

const { createMockEmployee, createMockInteraction, createMockTenant } = require('../../testDataFactory');

describe('Interaction API', () => {
  let testTenant, testEmployee, authToken;

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
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);
    
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

  describe('POST /api/interactions', () => {
    test('should create a new interaction', async () => {
      const interaction = createMockInteraction({
        employee_id: testEmployee.employee_id
      });
      
      // Mock the Supabase chain for interaction creation
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-456',
          tenant_id: testTenant.tenantId,
          from_employee_id: interaction.employee_id,
          to_employee_id: interaction.employee_id,
          interaction_type: interaction.type,
          content: interaction.content,
          timestamp: interaction.timestamp
        }], 
        error: null 
      });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .post('/api/interactions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(interaction)
        .expect(201);
      
      expect(response.body).toHaveProperty('message', 'Interaction created successfully');
      expect(response.body.interaction).toHaveProperty('interaction_type', interaction.type);
      expect(response.body.interaction).toHaveProperty('content', interaction.content);
    });

    test('should return 400 for invalid interaction data', async () => {
      const invalidInteraction = {
        // Missing required fields
      };
      
      await request(app)
        .post('/api/interactions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(invalidInteraction)
        .expect(400);
    });
  });

  describe('GET /api/interactions', () => {
    test('should get all interactions', async () => {
      // Mock the Supabase chain for getting interactions
      const rangeMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-456',
          tenant_id: testTenant.tenantId,
          from_employee_id: testEmployee.employee_id,
          to_employee_id: testEmployee.employee_id,
          interaction_type: 'code_review',
          content: 'Reviewed pull request',
          timestamp: '2023-01-01T10:00:00Z'
        }], 
        error: null,
        count: 1
      });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get('/api/interactions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should handle pagination parameters', async () => {
      // Mock the Supabase chain for getting interactions with pagination
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
        .get('/api/interactions?page=2&limit=5')
        .set('X-Tenant-ID', testTenant.tenantId)
        .expect(200);
      
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 2);
      expect(response.body.pagination).toHaveProperty('limit', 5);
    });
  });

  describe('GET /api/interactions/employee/:id', () => {
    test('should get interactions for a specific employee', async () => {
      // Mock the Supabase chain for getting interactions by employee ID
      const eq2Mock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-456',
          tenant_id: testTenant.tenantId,
          from_employee_id: testEmployee.employee_id,
          to_employee_id: testEmployee.employee_id,
          interaction_type: 'code_review',
          content: 'Reviewed pull request',
          timestamp: '2023-01-01T10:00:00Z'
        }], 
        error: null 
      });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get(`/api/interactions/employee/${testEmployee.employee_id}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('to_employee_id', testEmployee.employee_id);
    });
  });
});