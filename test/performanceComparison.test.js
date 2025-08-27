// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const employeeRepository = require('../src/repositories/employeeRepository');
const interactionRepository = require('../src/repositories/interactionRepository');
const kudosRepository = require('../src/repositories/kudosRepository');
const contributionRepository = require('../src/repositories/contributionRepository');

// Mock the Supabase client
jest.mock('../src/utils/supabaseClient', () => ({
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
  hash: jest.fn().mockResolvedValue('$2b$10$VEMjb13lGmvtm6xVG7o0/eF0Jw9XPJJGpcQNeH6LrgA/dOC6oPrjG'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('Performance Comparison Tests', () => {
  const testTenantId = 'test-tenant';
  const testEmployeeId = 'emp-001';
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Employee Operations Performance', () => {
    test('should measure getEmployeeById performance', async () => {
      const mockEmployee = {
        id: 'uuid-123',
        tenant_id: testTenantId,
        employee_id: testEmployeeId,
        name: 'Test Employee',
        email: 'test@example.com',
        department: 'Engineering',
        team: 'Backend',
        role: 'Developer'
      };

      // Mock the Supabase chain for getEmployeeById
      const singleMock = jest.fn().mockResolvedValueOnce({ data: mockEmployee, error: null });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      // Measure performance
      const startTime = performance.now();
      const employee = await employeeRepository.getEmployeeById(testTenantId, testEmployeeId);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify the operation completed successfully
      expect(employee).toHaveProperty('employee_id', testEmployeeId);
      
      // Log performance (in a real test, we might assert against a threshold)
      console.log(`getEmployeeById took ${duration} milliseconds`);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(singleMock).toHaveBeenCalled();
    });

    test('should measure getEmployees pagination performance', async () => {
      const mockEmployees = Array.from({ length: 10 }, (_, i) => ({
        id: `uuid-${i}`,
        tenant_id: testTenantId,
        employee_id: `emp-${i.toString().padStart(3, '0')}`,
        name: `Test Employee ${i}`,
        email: `test${i}@example.com`,
        department: 'Engineering',
        team: i % 2 === 0 ? 'Backend' : 'Frontend',
        role: 'Developer'
      }));
      const mockCount = mockEmployees.length;

      // Mock the Supabase chain for getEmployees
      const rangeMock = jest.fn().mockResolvedValueOnce({ data: mockEmployees, error: null, count: mockCount });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      // Measure performance
      const startTime = performance.now();
      const result = await employeeRepository.getEmployees(testTenantId, 1, 10);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify the operation completed successfully
      expect(result.data).toHaveLength(10);
      expect(result.pagination).toHaveProperty('totalCount', mockCount);
      
      // Log performance
      console.log(`getEmployees pagination took ${duration} milliseconds`);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(eqMock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(rangeMock).toHaveBeenCalledWith(0, 9);
    });
  });

  describe('Interaction Operations Performance', () => {
    test('should measure getInteractionsByEmployeeId performance', async () => {
      const mockInteractions = Array.from({ length: 5 }, (_, i) => ({
        id: `uuid-${i}`,
        tenant_id: testTenantId,
        from_employee_id: testEmployeeId,
        to_employee_id: testEmployeeId,
        interaction_type: 'code_review',
        content: `Reviewed pull request #${123 + i}`,
        timestamp: new Date(Date.now() - i * 86400000).toISOString() // Different days
      }));

      // Mock the Supabase chain for getInteractionsByEmployeeId
      const eq2Mock = jest.fn().mockResolvedValueOnce({ data: mockInteractions, error: null });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      // Measure performance
      const startTime = performance.now();
      const interactions = await interactionRepository.getInteractionsByEmployeeId(testTenantId, testEmployeeId);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify the operation completed successfully
      expect(interactions).toHaveLength(5);
      
      // Log performance
      console.log(`getInteractionsByEmployeeId took ${duration} milliseconds`);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('interactions');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('to_employee_id', testEmployeeId);
    });
  });

  describe('Kudos Operations Performance', () => {
    test('should measure getKudosByEmployeeId performance', async () => {
      const mockKudos = Array.from({ length: 3 }, (_, i) => ({
        id: `uuid-${i}`,
        tenant_id: testTenantId,
        from_employee_id: `emp-${(i + 1).toString().padStart(3, '0')}`,
        to_employee_id: testEmployeeId,
        message: `Great work on task ${i + 1}!`,
        timestamp: new Date(Date.now() - i * 86400000).toISOString() // Different days
      }));

      // Mock the Supabase chain for getKudosByEmployeeId
      const eq2Mock = jest.fn().mockResolvedValueOnce({ data: mockKudos, error: null });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      // Measure performance
      const startTime = performance.now();
      const kudos = await kudosRepository.getKudosByEmployeeId(testTenantId, testEmployeeId);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify the operation completed successfully
      expect(kudos).toHaveLength(3);
      
      // Log performance
      console.log(`getKudosByEmployeeId took ${duration} milliseconds`);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('kudos');
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('to_employee_id', testEmployeeId);
      expect(selectMock).toHaveBeenCalled();
    });
  });

  describe('Contribution Operations Performance', () => {
    test('should measure getContributionsByEmployeeId performance', async () => {
      const mockContributions = Array.from({ length: 5 }, (_, i) => ({
        id: `uuid-${i}`,
        tenant_id: testTenantId,
        employee_id: testEmployeeId,
        problem_solving_score: (80 + i * 2).toString(),
        collaboration_score: (85 + i).toString(),
        initiative_score: (75 + i * 3).toString(),
        overall_score: (80 + i * 1.5).toString(),
        calculated_at: new Date(Date.now() - i * 86400000).toISOString() // Different days
      }));

      // Mock the Supabase chain for getContributionsByEmployeeId
      const orderMock = jest.fn().mockResolvedValueOnce({ data: mockContributions, error: null });
      const eq2Mock = jest.fn().mockReturnValue({ order: orderMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      // Measure performance
      const startTime = performance.now();
      const contributions = await contributionRepository.getContributionsByEmployeeId(testTenantId, testEmployeeId);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify the operation completed successfully
      expect(contributions).toHaveLength(5);
      
      // Log performance
      console.log(`getContributionsByEmployeeId took ${duration} milliseconds`);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('contributions');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(orderMock).toHaveBeenCalledWith('calculated_at', { ascending: false });
    });
  });

  describe('Create Operations Performance', () => {
    test('should measure createEmployee performance', async () => {
      const employeeData = {
        employee_id: 'emp-999',
        name: 'New Employee',
        email: 'new@example.com',
        department: 'Engineering',
        team: 'Backend',
        role: 'Developer',
        password: 'password123'
      };
      
      const mockCreatedEmployee = {
        id: 'uuid-999',
        tenant_id: testTenantId,
        ...employeeData
      };
      delete mockCreatedEmployee.password; // Password should be removed from response

      // Mock the Supabase chain for createEmployee
      const selectMock = jest.fn().mockResolvedValueOnce({ data: [mockCreatedEmployee], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      // Measure performance
      const startTime = performance.now();
      const employee = await employeeRepository.createEmployee(testTenantId, employeeData);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify the operation completed successfully
      expect(employee).toHaveProperty('employee_id', 'emp-999');
      expect(employee).not.toHaveProperty('password'); // Password should be removed
      
      // Log performance
      console.log(`createEmployee took ${duration} milliseconds`);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      // Note: We can't check the exact insert data because bcrypt hashes the password
      expect(insertMock).toHaveBeenCalled();
      expect(selectMock).toHaveBeenCalled();
    });
  });
});