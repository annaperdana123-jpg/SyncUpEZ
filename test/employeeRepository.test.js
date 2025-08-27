// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const employeeRepository = require('../src/repositories/employeeRepository');

// Mock Supabase client
jest.mock('../src/utils/supabaseClient', () => {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };
});

// Removed bcrypt mock as it's no longer needed

describe('Employee Repository', () => {
  const testTenantId = 'test-tenant';
  const testEmployeeId = 'emp-001';
  const testEmployee = {
    id: 'uuid-123',
    tenant_id: testTenantId,
    employee_id: testEmployeeId,
    name: 'Test Employee',
    email: 'test@example.com',
    department: 'Engineering',
    team: 'Backend',
    role: 'Developer'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getEmployees', () => {
    test('should retrieve employees with pagination', async () => {
      const mockData = [testEmployee];
      const mockCount = 1;
      
      // Mock the Supabase chain
      const rangeMock = jest.fn().mockResolvedValueOnce({ data: mockData, error: null, count: mockCount });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await employeeRepository.getEmployees(testTenantId, 1, 10);
      
      expect(result).toEqual({
        data: mockData,
        pagination: {
          page: 1,
          limit: 10,
          totalCount: mockCount,
          totalPages: 1
        }
      });
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(selectMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(rangeMock).toHaveBeenCalledWith(0, 9);
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error
      const rangeMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(employeeRepository.getEmployees(testTenantId, 1, 10))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('getEmployeeById', () => {
    test('should retrieve employee by ID', async () => {
      // Mock the Supabase chain
      const singleMock = jest.fn().mockResolvedValueOnce({ data: testEmployee, error: null });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await employeeRepository.getEmployeeById(testTenantId, testEmployeeId);
      
      expect(result).toEqual(testEmployee);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(singleMock).toHaveBeenCalled();
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Employee not found';
      
      // Mock the Supabase chain with error
      const singleMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(employeeRepository.getEmployeeById(testTenantId, testEmployeeId))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('createEmployee', () => {
    test('should create new employee', async () => {
      const employeeData = { ...testEmployee };
      delete employeeData.id;
      delete employeeData.tenant_id;
      
      // Mock the Supabase chain
      const selectMock = jest.fn().mockResolvedValueOnce({ data: [testEmployee], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await employeeRepository.createEmployee(testTenantId, employeeData);
      
      expect(result).toEqual(testEmployee);
      // Removed bcrypt hash expectation as it's no longer used
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(insertMock).toHaveBeenCalledWith([{ 
        ...employeeData, 
        tenant_id: testTenantId
      }]);
      expect(selectMock).toHaveBeenCalled();
    });
  });

  describe('updateEmployee', () => {
    test('should update employee', async () => {
      const updateData = { name: 'Updated Name' };
      
      // Mock the Supabase chain
      const selectMock = jest.fn().mockResolvedValueOnce({ data: [{ ...testEmployee, ...updateData }], error: null });
      const eq2Mock = jest.fn().mockReturnValue({ select: selectMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const updateMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ update: updateMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await employeeRepository.updateEmployee(testTenantId, testEmployeeId, updateData);
      
      expect(result).toEqual({ ...testEmployee, ...updateData });
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(updateMock).toHaveBeenCalledWith(updateData);
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(selectMock).toHaveBeenCalled();
    });
  });

  describe('deleteEmployee', () => {
    test('should delete employee', async () => {
      // Mock the Supabase chain
      const selectMock = jest.fn().mockResolvedValueOnce({ data: [testEmployee], error: null });
      const eq2Mock = jest.fn().mockReturnValue({ select: selectMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ delete: deleteMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await employeeRepository.deleteEmployee(testTenantId, testEmployeeId);
      
      expect(result).toEqual(testEmployee);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(deleteMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(selectMock).toHaveBeenCalled();
    });
  });
});