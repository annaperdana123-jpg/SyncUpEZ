// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

// Mock the Supabase client before importing modules
jest.mock('../../src/utils/supabaseClient', () => ({
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
const app = require('../../server');
const { createMockEmployee, createMockTenant } = require('../testDataFactory');

describe('Data Validation', () => {
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
    
    require('../../src/utils/supabaseClient').from.mockImplementation(fromMock);
    
    // Create the employee
    await request(app)
      .post('/api/employees')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send(testEmployee)
      .expect(201);
    
    // Mock the Supabase auth for login
    require('../../src/utils/supabaseClient').auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-id',
          email: testEmployee.email,
          user_metadata: {
            tenant_id: testTenant.tenantId
          }
        },
        session: {
          access_token: 'valid-token'
        }
      },
      error: null
    });
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Tenant-ID', testTenant.tenantId)
      .send({
        email: testEmployee.email,
        password: testEmployee.password
      })
      .expect(200);
    
    authToken = 'valid-token';
  });

  describe('Employee Data Validation', () => {
    test('should reject employee creation with invalid email', async () => {
      const invalidEmployee = createMockEmployee({
        email: 'invalid-email'
      });

      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(invalidEmployee)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body.message).toContain('Email is invalid');
    });

    test('should reject employee creation with missing required fields', async () => {
      const invalidEmployee = {
        name: 'John Doe'
        // Missing required fields like employee_id, email, password
      };

      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(invalidEmployee)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body.message).toContain('Employee ID is required');
    });

    test('should reject employee creation with duplicate employee_id', async () => {
      // Mock the Supabase chain to simulate employee already exists
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
      
      require('../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      // Try to create employee with same ID as existing one
      const duplicateEmployee = createMockEmployee({
        employee_id: testEmployee.employee_id,
        email: `new${Date.now()}@example.com` // Different email to avoid email conflict
      });

      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(duplicateEmployee)
        .expect(409); // Conflict

      expect(response.body).toHaveProperty('error', 'Employee ID already exists');
    });

    test('should reject employee creation with duplicate email', async () => {
      // Mock the Supabase chain to simulate email already exists
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
      
      require('../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      // Try to create employee with same email as existing one
      const duplicateEmployee = createMockEmployee({
        employee_id: `new_emp_${Date.now()}`, // Different ID
        email: testEmployee.email // Same email
      });

      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(duplicateEmployee)
        .expect(409); // Conflict

      expect(response.body).toHaveProperty('error', 'Email already exists');
    });
  });

  describe('Interaction Data Validation', () => {
    test('should reject interaction creation with missing employee_id', async () => {
      const invalidInteraction = {
        type: 'standup',
        content: 'Worked on testing'
        // Missing employee_id
      };

      const response = await request(app)
        .post('/api/interactions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidInteraction)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body.message).toContain('Employee ID is required');
    });
  });

  describe('Kudos Data Validation', () => {
    test('should reject kudos creation with missing required fields', async () => {
      const invalidKudos = {
        message: 'Great work!'
        // Missing from_employee_id and to_employee_id
      };

      const response = await request(app)
        .post('/api/kudos')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidKudos)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body.message).toContain('From employee ID is required');
    });

    test('should reject kudos creation when sending to oneself', async () => {
      const invalidKudos = {
        from_employee_id: testEmployee.employee_id,
        to_employee_id: testEmployee.employee_id, // Same employee
        message: 'Great work!'
      };

      const response = await request(app)
        .post('/api/kudos')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidKudos)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body.message).toContain('Cannot send kudos to yourself');
    });
  });

  describe('Contribution Data Validation', () => {
    test('should reject contribution creation with missing employee_id', async () => {
      const invalidContribution = {
        problem_solving_score: 80,
        collaboration_score: 75,
        initiative_score: 85
        // Missing employee_id
      };

      const response = await request(app)
        .post('/api/contributions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidContribution)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body.message).toContain('Employee ID is required');
    });

    test('should reject contribution creation with invalid score values', async () => {
      const invalidContribution = {
        employee_id: testEmployee.employee_id,
        problem_solving_score: 150, // Invalid score (> 100)
        collaboration_score: 75,
        initiative_score: 85
      };

      const response = await request(app)
        .post('/api/contributions')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidContribution)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body.message).toContain('Problem solving score must be between 0 and 100');
    });
  });
});