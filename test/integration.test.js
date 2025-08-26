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

  // Test employee creation (no auth required)
  test('should create a new employee', async () => {
    const response = await request(app)
      .post('/api/employees')
      .send(mockEmployee)
      .expect(201);
    
    expect(response.body).toHaveProperty('message', 'Employee created successfully');
    expect(response.body.employee).toHaveProperty('employee_id', mockEmployee.employee_id);
    createdEmployeeId = response.body.employee.employee_id;
  });

  // Test login to get auth token
  test('should login and return auth token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: mockEmployee.email,
        password: mockEmployee.password
      })
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('token');
    authToken = response.body.token;
  });

  // Test getting all employees (auth required)
  test('should get all employees', async () => {
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
    const response = await request(app)
      .get(`/api/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('employee_id', createdEmployeeId);
    expect(response.body).toHaveProperty('name', mockEmployee.name);
  });

  // Test creating interaction (auth required)
  test('should create a new interaction', async () => {
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
    
    await request(app)
      .post('/api/employees')
      .send(secondEmployee);
    
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
    const response = await request(app)
      .get(`/api/analytics/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('employee_id', createdEmployeeId);
    expect(response.body).toHaveProperty('name', mockEmployee.name);
  });

  test('should get overall stats', async () => {
    const response = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('total_employees');
    expect(response.body).toHaveProperty('total_interactions');
    expect(response.body).toHaveProperty('total_kudos');
  });

  test('should get top contributors', async () => {
    const response = await request(app)
      .get('/api/analytics/top-contributors')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });
});