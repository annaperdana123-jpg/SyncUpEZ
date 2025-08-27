// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const interactionRepository = require('../src/repositories/interactionRepository');

// Mock Supabase client - using the same pattern as employeeRepository.test.js
jest.mock('../src/utils/supabaseClient', () => {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };
});

describe('Interaction Repository', () => {
  const testTenantId = 'test-tenant';
  const testEmployeeId = 'emp-001';
  const testInteraction = {
    id: 'uuid-123',
    tenant_id: testTenantId,
    from_employee_id: testEmployeeId,
    to_employee_id: testEmployeeId,
    interaction_type: 'code_review',
    content: 'Reviewed pull request #123',
    timestamp: '2023-01-01T10:00:00Z'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getInteractions', () => {
    test('should retrieve interactions with pagination', async () => {
      const mockData = [testInteraction];
      const mockCount = 1;
      
      // Mock the Supabase chain following the pattern from employeeRepository.test.js
      const rangeMock = jest.fn().mockResolvedValueOnce({ data: mockData, error: null, count: mockCount });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await interactionRepository.getInteractions(testTenantId, 1, 10);
      
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
      expect(fromMock).toHaveBeenCalledWith('interactions');
      expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact' });
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

      await expect(interactionRepository.getInteractions(testTenantId, 1, 10))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('getInteractionsByEmployeeId', () => {
    test('should retrieve interactions by employee ID', async () => {
      // Mock the Supabase chain following the exact pattern from employeeRepository.test.js getEmployeeById
      const eq2Mock = jest.fn().mockResolvedValueOnce({ data: [testInteraction], error: null });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await interactionRepository.getInteractionsByEmployeeId(testTenantId, testEmployeeId);
      
      expect(result).toEqual([testInteraction]);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('interactions');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('to_employee_id', testEmployeeId);
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error following the exact pattern from employeeRepository.test.js
      const eq2Mock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(interactionRepository.getInteractionsByEmployeeId(testTenantId, testEmployeeId))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('createInteraction', () => {
    test('should create new interaction', async () => {
      const interactionData = { ...testInteraction };
      delete interactionData.id;
      delete interactionData.tenant_id;
      
      // Mock the Supabase chain following the pattern from employeeRepository.test.js
      const selectMock = jest.fn().mockResolvedValueOnce({ data: [testInteraction], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await interactionRepository.createInteraction(testTenantId, interactionData);
      
      expect(result).toEqual(testInteraction);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('interactions');
      expect(insertMock).toHaveBeenCalledWith([{ 
        ...interactionData, 
        tenant_id: testTenantId
      }]);
      expect(selectMock).toHaveBeenCalled();
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      const interactionData = { ...testInteraction };
      delete interactionData.id;
      delete interactionData.tenant_id;
      
      // Mock the Supabase chain with error
      const selectMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(interactionRepository.createInteraction(testTenantId, interactionData))
        .rejects
        .toThrow(errorMessage);
    });
  });
});