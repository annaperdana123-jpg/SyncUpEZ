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

const { createMockEmployee, createMockKudos, createMockTenant } = require('../../testDataFactory');

describe('Kudos API', () => {
  let testTenant, testEmployee1, testEmployee2, authToken;

  beforeAll(async () => {
    // Setup test tenant and employees
    testTenant = createMockTenant();
    testEmployee1 = createMockEmployee({
      employee_id: 'emp-001',
      email: 'emp1@example.com'
    });
    testEmployee2 = createMockEmployee({
      employee_id: 'emp-002',
      email: 'emp2@example.com'
    });
    
    // Mock the Supabase chain for employee creation
    const selectMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-123',
        tenant_id: testTenant.tenantId,
        employee_id: testEmployee1.employee_id,
        name: testEmployee1.name,
        email: testEmployee1.email,
        department: testEmployee1.department,
        team: testEmployee1.team,
        role: testEmployee1.role
      }], 
      error: null 
    });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    
    require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    // Create the first employee
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee1)
      .expect(201);
    
    // Create the second employee
    const selectMock2 = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-124',
        tenant_id: testTenant.tenantId,
        employee_id: testEmployee2.employee_id,
        name: testEmployee2.name,
        email: testEmployee2.email,
        department: testEmployee2.department,
        team: testEmployee2.team,
        role: testEmployee2.role
      }], 
      error: null 
    });
    const insertMock2 = jest.fn().mockReturnValue({ select: selectMock2 });
    const fromMock2 = jest.fn().mockReturnValue({ insert: insertMock2 });
    
    require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock2);
    
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee2)
      .expect(201);
    
    // Mock the Supabase chain for login
    const singleMock = jest.fn().mockResolvedValueOnce({ 
      data: { 
        id: 'uuid-123',
        tenant_id: testTenant.tenantId,
        employee_id: testEmployee1.employee_id,
        name: testEmployee1.name,
        email: testEmployee1.email,
        department: testEmployee1.department,
        team: testEmployee1.team,
        role: testEmployee1.role
      }, 
      error: null 
    });
    const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock3 = jest.fn().mockReturnValue({ eq: eq1Mock });
    const fromMock3 = jest.fn().mockReturnValue({ select: selectMock3 });
    
    require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock3);
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee1.email,
        password: testEmployee1.password
      })
      .expect(200);
    
    authToken = loginResponse.body.token;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/kudos', () => {
    test('should create a new kudos', async () => {
      const kudos = createMockKudos({
        from_employee_id: testEmployee1.employee_id,
        to_employee_id: testEmployee2.employee_id
      });
      
      // Mock the Supabase chain for kudos creation
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-789',
          tenant_id: testTenant.tenantId,
          from_employee_id: kudos.from_employee_id,
          to_employee_id: kudos.to_employee_id,
          message: kudos.message,
          timestamp: kudos.timestamp
        }], 
        error: null 
      });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .post('/api/kudos')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(kudos)
        .expect(201);
      
      expect(response.body).toHaveProperty('message', 'Kudos created successfully');
      expect(response.body.kudos).toHaveProperty('message', kudos.message);
      expect(response.body.kudos).toHaveProperty('from_employee_id', kudos.from_employee_id);
      expect(response.body.kudos).toHaveProperty('to_employee_id', kudos.to_employee_id);
    });

    test('should return 400 for invalid kudos data', async () => {
      const invalidKudos = {
        // Missing required fields
      };
      
      await request(app)
        .post('/api/kudos')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(invalidKudos)
        .expect(400);
    });

    test('should return 400 when trying to give kudos to yourself', async () => {
      const invalidKudos = createMockKudos({
        from_employee_id: testEmployee1.employee_id,
        to_employee_id: testEmployee1.employee_id
      });
      
      await request(app)
        .post('/api/kudos')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(invalidKudos)
        .expect(400);
    });
  });

  describe('GET /api/kudos', () => {
    test('should get all kudos', async () => {
      // Mock the Supabase chain for getting kudos
      const rangeMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-789',
          tenant_id: testTenant.tenantId,
          from_employee_id: testEmployee1.employee_id,
          to_employee_id: testEmployee2.employee_id,
          message: 'Great work!',
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
        .get('/api/kudos')
        .set('X-Tenant-ID', testTenant.tenantId)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should handle pagination parameters', async () => {
      // Mock the Supabase chain for getting kudos with pagination
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
        .get('/api/kudos?page=2&limit=5')
        .set('X-Tenant-ID', testTenant.tenantId)
        .expect(200);
      
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 2);
      expect(response.body.pagination).toHaveProperty('limit', 5);
    });
  });

  describe('GET /api/kudos/employee/:id', () => {
    test('should get kudos for a specific employee', async () => {
      // Mock the Supabase chain for getting kudos by employee ID
      const eq2Mock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-789',
          tenant_id: testTenant.tenantId,
          from_employee_id: testEmployee1.employee_id,
          to_employee_id: testEmployee2.employee_id,
          message: 'Great work!',
          timestamp: '2023-01-01T10:00:00Z'
        }], 
        error: null 
      });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get(`/api/kudos/employee/${testEmployee2.employee_id}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('to_employee_id', testEmployee2.employee_id);
    });
  });
});