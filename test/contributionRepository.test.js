// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const contributionRepository = require('../src/repositories/contributionRepository');

// Mock Supabase client - using the same pattern as employeeRepository.test.js
jest.mock('../src/utils/supabaseClient', () => {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };
});

describe('Contribution Repository', () => {
  const testTenantId = 'test-tenant';
  const testEmployeeId = 'emp-001';
  const testContribution = {
    id: 'uuid-123',
    tenant_id: testTenantId,
    employee_id: testEmployeeId,
    problem_solving_score: 85,
    collaboration_score: 90,
    initiative_score: 75,
    overall_score: 83,
    calculated_at: '2023-01-01T10:00:00Z'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getContributionsByEmployeeId', () => {
    test('should retrieve contributions by employee ID', async () => {
      // Mock the Supabase chain following the exact pattern from employeeRepository.test.js getEmployeeById
      const orderMock = jest.fn().mockResolvedValueOnce({ data: [testContribution], error: null });
      const eq2Mock = jest.fn().mockReturnValue({ order: orderMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await contributionRepository.getContributionsByEmployeeId(testTenantId, testEmployeeId);
      
      expect(result).toEqual([testContribution]);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('contributions');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(orderMock).toHaveBeenCalledWith('calculated_at', { ascending: false });
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error following the exact pattern from employeeRepository.test.js
      const orderMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const eq2Mock = jest.fn().mockReturnValue({ order: orderMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(contributionRepository.getContributionsByEmployeeId(testTenantId, testEmployeeId))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('getContributions', () => {
    test('should retrieve contributions with pagination', async () => {
      const mockData = [testContribution];
      const mockCount = 1;
      
      // Mock the Supabase chain following the pattern from employeeRepository.test.js
      const orderMock = jest.fn().mockResolvedValueOnce({ data: mockData, error: null, count: mockCount });
      const rangeMock = jest.fn().mockReturnValue({ order: orderMock });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await contributionRepository.getContributions(testTenantId, 1, 10);
      
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
      expect(fromMock).toHaveBeenCalledWith('contributions');
      expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(eqMock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(rangeMock).toHaveBeenCalledWith(0, 9);
      expect(orderMock).toHaveBeenCalledWith('calculated_at', { ascending: false });
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error
      const orderMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const rangeMock = jest.fn().mockReturnValue({ order: orderMock });
      const eqMock = jest.fn().mockReturnValue({ range: rangeMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(contributionRepository.getContributions(testTenantId, 1, 10))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('getLatestContribution', () => {
    test('should retrieve latest contribution for employee', async () => {
      // Mock the Supabase chain following the exact pattern from employeeRepository.test.js
      const limitMock = jest.fn().mockResolvedValueOnce({ data: [testContribution], error: null });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eq2Mock = jest.fn().mockReturnValue({ order: orderMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await contributionRepository.getLatestContribution(testTenantId, testEmployeeId);
      
      expect(result).toEqual(testContribution);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('contributions');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(orderMock).toHaveBeenCalledWith('calculated_at', { ascending: false });
      expect(limitMock).toHaveBeenCalledWith(1);
    });

    test('should return null when no contributions found', async () => {
      // Mock the Supabase chain with empty data
      const limitMock = jest.fn().mockResolvedValueOnce({ data: [], error: null });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eq2Mock = jest.fn().mockReturnValue({ order: orderMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await contributionRepository.getLatestContribution(testTenantId, testEmployeeId);
      
      expect(result).toBeNull();
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error
      const limitMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const eq2Mock = jest.fn().mockReturnValue({ order: orderMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(contributionRepository.getLatestContribution(testTenantId, testEmployeeId))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('createContribution', () => {
    test('should create new contribution', async () => {
      const contributionData = { ...testContribution };
      delete contributionData.id;
      delete contributionData.tenant_id;
      
      // Mock the Supabase chain following the pattern from employeeRepository.test.js
      const selectMock = jest.fn().mockResolvedValueOnce({ data: [testContribution], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await contributionRepository.createContribution(testTenantId, contributionData);
      
      expect(result).toEqual(testContribution);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('contributions');
      expect(insertMock).toHaveBeenCalledWith([{ 
        ...contributionData, 
        tenant_id: testTenantId
      }]);
      expect(selectMock).toHaveBeenCalled();
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      const contributionData = { ...testContribution };
      delete contributionData.id;
      delete contributionData.tenant_id;
      
      // Mock the Supabase chain with error
      const selectMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(contributionRepository.createContribution(testTenantId, contributionData))
        .rejects
        .toThrow(errorMessage);
    });
  });
});