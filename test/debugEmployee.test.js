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
  rpc: jest.fn().mockResolvedValue({ data: null, error: null })
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

const employeeRepository = require('../src/repositories/employeeRepository');

describe('Debug Employee Repository', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should create a new employee', async () => {
    const testEmployee = {
      employee_id: 'emp-001',
      name: 'Test Employee',
      email: 'test@example.com',
      password: 'password123',
      department: 'Engineering',
      team: 'Backend',
      role: 'Developer'
    };
    
    // Mock the Supabase chain for employee creation
    const selectMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-123',
        tenant_id: 'test-tenant',
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
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

    const result = await employeeRepository.createEmployee('test-tenant', testEmployee);
    
    expect(result).toEqual({ 
      id: 'uuid-123',
      tenant_id: 'test-tenant',
      employee_id: testEmployee.employee_id,
      name: testEmployee.name,
      email: testEmployee.email,
      department: testEmployee.department,
      team: testEmployee.team,
      role: testEmployee.role
    });
  });
});