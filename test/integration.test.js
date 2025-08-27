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

// Mock data with unique IDs for each test run
const timestamp = Date.now();
const mockEmployee = {
  employee_id: `emp_test_${timestamp}`,
  name: 'Test User',
  email: `test${timestamp}@example.com`,
  password: 'password123',
  department: 'Engineering',
  team: 'Backend',
  role: 'Developer',
  hire_date: '2023-01-01'
};

const mockInteraction = {
  employee_id: `emp_test_${timestamp}`,
  type: 'standup',
  content: 'Worked on testing the application'
};

const mockKudos = {
  from_employee_id: `emp_test_${timestamp}`,
  to_employee_id: `emp_test2_${timestamp}`,
  message: 'Great work on the project!'
};

describe('Integration Tests', () => {
  let authToken;
  let createdEmployeeId;

  beforeAll(async () => {
    // Mock the Supabase chain for employee creation
    const selectMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-123',
        tenant_id: 'test-tenant',
        employee_id: mockEmployee.employee_id,
        name: mockEmployee.name,
        email: mockEmployee.email,
        department: mockEmployee.department,
        team: mockEmployee.team,
        role: mockEmployee.role
      }], 
      error: null 
    });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    // Create employee
    const createResponse = await request(app)
      .post('/api/employees')
      .send(mockEmployee)
      .expect(201);
    
    createdEmployeeId = createResponse.body.employee.employee_id;
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: mockEmployee.email,
        password: mockEmployee.password
      })
      .expect(200);
    
    authToken = 'test-access-token'; // Using mocked token
  });

  // Test getting all employees (auth required)
  test('should get all employees', async () => {
    // Mock the Supabase chain for getting employees
    const rangeMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-123',
        tenant_id: 'test-tenant',
        employee_id: mockEmployee.employee_id,
        name: mockEmployee.name,
        email: mockEmployee.email,
        department: mockEmployee.department,
        team: mockEmployee.team,
        role: mockEmployee.role
      }], 
      error: null,
      count: 1
    });
    const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    const response = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  // Test getting employee by ID (auth required)
  test('should get employee by ID', async () => {
    // Mock the Supabase chain for getting employee by ID
    const singleMock = jest.fn().mockResolvedValueOnce({ 
      data: { 
        id: 'uuid-123',
        tenant_id: 'test-tenant',
        employee_id: mockEmployee.employee_id,
        name: mockEmployee.name,
        email: mockEmployee.email,
        department: mockEmployee.department,
        team: mockEmployee.team,
        role: mockEmployee.role
      }, 
      error: null 
    });
    const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
    const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
    const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    const response = await request(app)
      .get(`/api/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('employee_id', createdEmployeeId);
    expect(response.body).toHaveProperty('name', mockEmployee.name);
  });

  // Test creating interaction (auth required)
  test('should create a new interaction', async () => {
    // Mock the Supabase chain for interaction creation
    const selectMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'interaction-123',
        tenant_id: 'test-tenant',
        employee_id: mockEmployee.employee_id,
        type: mockInteraction.type,
        content: mockInteraction.content
      }], 
      error: null 
    });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    const response = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send(mockInteraction)
      .expect(201);
    
    expect(response.body).toHaveProperty('message', 'Interaction created successfully');
    expect(response.body.interaction).toHaveProperty('interaction_id');
    expect(response.body.interaction).toHaveProperty('employee_id', mockInteraction.employee_id);
  });

  // Test getting all interactions (auth required)
  test('should get all interactions', async () => {
    // Mock the Supabase chain for getting interactions
    const rangeMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'interaction-123',
        tenant_id: 'test-tenant',
        employee_id: mockEmployee.employee_id,
        type: mockInteraction.type,
        content: mockInteraction.content
      }], 
      error: null,
      count: 1
    });
    const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    const response = await request(app)
      .get('/api/interactions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // Test creating kudos (auth required)
  test('should create a new kudos', async () => {
    // First create a second employee for the kudos
    const secondEmployee = {
      employee_id: `emp_test2_${timestamp}`,
      name: 'Test User 2',
      email: `test2${timestamp}@example.com`,
      password: 'password123',
      department: 'Engineering',
      team: 'Frontend',
      role: 'Developer',
      hire_date: '2023-01-02'
    };
    
    // Mock the Supabase chain for second employee creation
    const selectMock1 = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-124',
        tenant_id: 'test-tenant',
        employee_id: secondEmployee.employee_id,
        name: secondEmployee.name,
        email: secondEmployee.email,
        department: secondEmployee.department,
        team: secondEmployee.team,
        role: secondEmployee.role
      }], 
      error: null 
    });
    const insertMock1 = jest.fn().mockReturnValue({ select: selectMock1 });
    const fromMock1 = jest.fn().mockReturnValue({ insert: insertMock1 });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock1);
    
    await request(app)
      .post('/api/employees')
      .send(secondEmployee);
    
    // Mock the Supabase chain for kudos creation
    const selectMock2 = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'kudos-123',
        tenant_id: 'test-tenant',
        from_employee_id: mockEmployee.employee_id,
        to_employee_id: secondEmployee.employee_id,
        message: mockKudos.message
      }], 
      error: null 
    });
    const insertMock2 = jest.fn().mockReturnValue({ select: selectMock2 });
    const fromMock2 = jest.fn().mockReturnValue({ insert: insertMock2 });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock2);
    
    const response = await request(app)
      .post('/api/kudos')
      .set('Authorization', `Bearer ${authToken}`)
      .send(mockKudos)
      .expect(201);
    
    expect(response.body).toHaveProperty('message', 'Kudos created successfully');
    expect(response.body.kudos).toHaveProperty('kudos_id');
  });

  // Test getting all kudos (auth required)
  test('should get all kudos', async () => {
    // Mock the Supabase chain for getting kudos
    const rangeMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'kudos-123',
        tenant_id: 'test-tenant',
        from_employee_id: mockEmployee.employee_id,
        to_employee_id: `emp_test2_${timestamp}`,
        message: mockKudos.message
      }], 
      error: null,
      count: 1
    });
    const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    const response = await request(app)
      .get('/api/kudos')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // Test adding contribution scores (auth required)
  test('should add contribution scores', async () => {
    const contributionData = {
      employee_id: createdEmployeeId,
      problem_solving_score: 80,
      collaboration_score: 75,
      initiative_score: 85,
      overall_score: 80
    };
    
    // Mock the Supabase chain for contribution creation
    const selectMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'contribution-123',
        tenant_id: 'test-tenant',
        employee_id: createdEmployeeId,
        problem_solving_score: 80,
        collaboration_score: 75,
        initiative_score: 85,
        overall_score: 80
      }], 
      error: null 
    });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    const response = await request(app)
      .post('/api/contributions')
      .set('Authorization', `Bearer ${authToken}`)
      .send(contributionData)
      .expect(201);
    
    expect(response.body).toHaveProperty('message', 'Contribution scores added successfully');
    expect(response.body.contribution).toHaveProperty('employee_id', createdEmployeeId);
    expect(response.body.contribution).toHaveProperty('problem_solving_score', 80);
  });

  // Test getting all contributions (auth required)
  test('should get all contributions', async () => {
    // Mock the Supabase chain for getting contributions
    const rangeMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'contribution-123',
        tenant_id: 'test-tenant',
        employee_id: createdEmployeeId,
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
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    const response = await request(app)
      .get('/api/contributions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // Test analytics endpoints (auth required)
  test('should get employee analytics', async () => {
    // Mock the Supabase chain for getting employee analytics
    const rpcMock = jest.fn().mockResolvedValueOnce({ 
      data: { 
        employee_id: createdEmployeeId,
        name: mockEmployee.name,
        total_interactions: 5,
        total_kudos: 2,
        average_contribution_score: 80
      }, 
      error: null 
    });
    
    require('../src/utils/supabaseClient').rpc.mockImplementation(rpcMock);
    
    const response = await request(app)
      .get(`/api/analytics/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('employee_id', createdEmployeeId);
    expect(response.body).toHaveProperty('name', mockEmployee.name);
  });

  test('should get overall stats', async () => {
    // Mock the Supabase chain for getting overall stats
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
    
    const response = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('total_employees');
    expect(response.body).toHaveProperty('total_interactions');
    expect(response.body).toHaveProperty('total_kudos');
  });

  test('should get top contributors', async () => {
    // Mock the Supabase chain for getting top contributors
    const rpcMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        employee_id: createdEmployeeId,
        name: mockEmployee.name,
        total_contributions: 15,
        average_score: 80
      }], 
      error: null 
    });
    
    require('../src/utils/supabaseClient').rpc.mockImplementation(rpcMock);
    
    const response = await request(app)
      .get('/api/analytics/top-contributors')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });
});