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
  rpc: jest.fn().mockResolvedValue({ data: null, error: null })
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

describe('Employee API', () => {
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
        // Removed password field as it's no longer stored
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
        // Removed password field as it's no longer stored
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
        password: testEmployee.password // This is handled by Supabase Auth
      })
      .expect(200);
    
    authToken = loginResponse.body.token;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/employees', () => {
    test('should create a new employee', async () => {
      const newEmployee = createMockEmployee({
        employee_id: `new_emp_${Date.now()}`,
        email: `new${Date.now()}@example.com`
      });
      
      // Mock the Supabase chain for employee creation
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-124',
          tenant_id: testTenant.tenantId,
          employee_id: newEmployee.employee_id,
          name: newEmployee.name,
          email: newEmployee.email,
          department: newEmployee.department,
          team: newEmployee.team,
          role: newEmployee.role
          // Removed password field as it's no longer stored
        }], 
        error: null 
      });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(newEmployee)
        .expect(201);
      
      expect(response.body).toHaveProperty('message', 'Employee created successfully');
      expect(response.body.employee).toHaveProperty('employee_id', newEmployee.employee_id);
      expect(response.body.employee).toHaveProperty('name', newEmployee.name);
      expect(response.body.employee).toHaveProperty('email', newEmployee.email);
    });

    test('should return 400 for invalid employee data', async () => {
      const invalidEmployee = {
        name: 'John Doe'
        // Missing required fields
      };
      
      await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(invalidEmployee)
        .expect(400);
    });

    test('should return 409 for duplicate employee ID', async () => {
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
          // Removed password field as it's no longer stored
        }, 
        error: null 
      });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      // Try to create employee with same ID
      await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(testEmployee) // Same employee data
        .expect(409);
    });
  });

  describe('GET /api/employees', () => {
    test('should get all employees', async () => {
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
          // Removed password field as it's no longer stored
        }], 
        error: null,
        count: 1
      });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .get('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    test('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        // No auth token
        .expect(401);
    });
  });

  describe('GET /api/employees/:id', () => {
    test('should get employee by ID', async () => {
      // Mock the Supabase chain for getting employee by ID
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
        .get(`/api/employees/${createdEmployeeId}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('employee_id', createdEmployeeId);
      expect(response.body).toHaveProperty('name', testEmployee.name);
      expect(response.body).toHaveProperty('email', testEmployee.email);
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
        .get('/api/employees/non-existent-id')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/employees/:id', () => {
    test('should update employee', async () => {
      const updateData = {
        name: 'Updated Name',
        department: 'Marketing'
      };
      
      // Mock the Supabase chain for updating employee
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-123',
          tenant_id: testTenant.tenantId,
          employee_id: testEmployee.employee_id,
          name: 'Updated Name',
          email: testEmployee.email,
          department: 'Marketing',
          team: testEmployee.team,
          role: testEmployee.role
          // Removed password field as it's no longer stored
        }], 
        error: null 
      });
      const eq2Mock = jest.fn().mockReturnValue({ select: selectMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const updateMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ update: updateMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      const response = await request(app)
        .put(`/api/employees/${createdEmployeeId}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Employee updated successfully');
      expect(response.body.employee).toHaveProperty('name', 'Updated Name');
      expect(response.body.employee).toHaveProperty('department', 'Marketing');
    });

    test('should return 404 for non-existent employee', async () => {
      // Mock the Supabase chain to simulate employee not found
      const selectMock = jest.fn().mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Employee not found' } 
      });
      const eq2Mock = jest.fn().mockReturnValue({ select: selectMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const updateMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ update: updateMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock);
      
      await request(app)
        .put('/api/employees/non-existent-id')
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    test('should delete employee', async () => {
      // Create a new employee to delete
      const employeeToDelete = createMockEmployee({
        employee_id: `delete_emp_${Date.now()}`,
        email: `delete${Date.now()}@example.com`
      });
      
      // Mock the Supabase chain for employee creation
      const selectMock1 = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-125',
          tenant_id: testTenant.tenantId,
          employee_id: employeeToDelete.employee_id,
          name: employeeToDelete.name,
          email: employeeToDelete.email,
          department: employeeToDelete.department,
          team: employeeToDelete.team,
          role: employeeToDelete.role
          // Removed password field as it's no longer stored
        }], 
        error: null 
      });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock1 });
      const fromMock1 = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock1);
      
      // Create the employee
      await request(app)
        .post('/api/employees')
        .set('X-Tenant-ID', testTenant.tenantId)
        .send(employeeToDelete)
        .expect(201);
      
      // Mock the Supabase chain for employee deletion
      const selectMock2 = jest.fn().mockResolvedValueOnce({ 
        data: [{ 
          id: 'uuid-125',
          tenant_id: testTenant.tenantId,
          employee_id: employeeToDelete.employee_id,
          name: employeeToDelete.name,
          email: employeeToDelete.email,
          department: employeeToDelete.department,
          team: employeeToDelete.team,
          role: employeeToDelete.role
          // Removed password field as it's no longer stored
        }], 
        error: null 
      });
      const eq2Mock = jest.fn().mockReturnValue({ select: selectMock2 });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock2 = jest.fn().mockReturnValue({ delete: deleteMock });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock2);
      
      // Delete the employee
      await request(app)
        .delete(`/api/employees/${employeeToDelete.employee_id}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Mock the Supabase chain to simulate employee not found after deletion
      const singleMock = jest.fn().mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Employee not found' } 
      });
      const eq2Mock2 = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock2 = jest.fn().mockReturnValue({ eq: eq2Mock2 });
      const selectMock3 = jest.fn().mockReturnValue({ eq: eq1Mock2 });
      const fromMock3 = jest.fn().mockReturnValue({ select: selectMock3 });
      
      require('../../../src/utils/supabaseClient').from.mockImplementation(fromMock3);
      
      // Verify employee is deleted
      await request(app)
        .get(`/api/employees/${employeeToDelete.employee_id}`)
        .set('X-Tenant-ID', testTenant.tenantId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});