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

describe('Data Consistency Tests', () => {
  const testTenantId = 'test-tenant';
  const testEmployeeId = 'emp-001';
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Employee Data Consistency', () => {
    test('should return consistent employee data structure', async () => {
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

      const employee = await employeeRepository.getEmployeeById(testTenantId, testEmployeeId);
      
      // Verify the structure matches what we expect
      expect(employee).toHaveProperty('employee_id', testEmployeeId);
      expect(employee).toHaveProperty('name', 'Test Employee');
      expect(employee).toHaveProperty('email', 'test@example.com');
      expect(employee).toHaveProperty('department', 'Engineering');
      expect(employee).toHaveProperty('team', 'Backend');
      expect(employee).toHaveProperty('role', 'Developer');
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(singleMock).toHaveBeenCalled();
    });
  });

  describe('Interaction Data Consistency', () => {
    test('should return consistent interaction data structure', async () => {
      const mockInteraction = {
        id: 'uuid-456',
        tenant_id: testTenantId,
        from_employee_id: testEmployeeId,
        to_employee_id: testEmployeeId,
        interaction_type: 'code_review',
        content: 'Reviewed pull request #123',
        timestamp: '2023-01-01T10:00:00Z'
      };

      // Mock the Supabase chain for getInteractionsByEmployeeId
      const eq2Mock = jest.fn().mockResolvedValueOnce({ data: [mockInteraction], error: null });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const interactions = await interactionRepository.getInteractionsByEmployeeId(testTenantId, testEmployeeId);
      
      // Verify the structure matches what we expect
      expect(interactions).toHaveLength(1);
      expect(interactions[0]).toHaveProperty('from_employee_id', testEmployeeId);
      expect(interactions[0]).toHaveProperty('to_employee_id', testEmployeeId);
      expect(interactions[0]).toHaveProperty('interaction_type', 'code_review');
      expect(interactions[0]).toHaveProperty('content', 'Reviewed pull request #123');
      expect(interactions[0]).toHaveProperty('timestamp', '2023-01-01T10:00:00Z');
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('interactions');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('to_employee_id', testEmployeeId);
    });
  });

  describe('Kudos Data Consistency', () => {
    test('should return consistent kudos data structure', async () => {
      const mockKudos = {
        id: 'uuid-789',
        tenant_id: testTenantId,
        from_employee_id: testEmployeeId,
        to_employee_id: testEmployeeId,
        message: 'Great work on the project!',
        timestamp: '2023-01-01T10:00:00Z'
      };

      // Mock the Supabase chain for getKudosByEmployeeId
      const eq2Mock = jest.fn().mockResolvedValueOnce({ data: [mockKudos], error: null });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const kudos = await kudosRepository.getKudosByEmployeeId(testTenantId, testEmployeeId);
      
      // Verify the structure matches what we expect
      expect(kudos).toHaveLength(1);
      expect(kudos[0]).toHaveProperty('from_employee_id', testEmployeeId);
      expect(kudos[0]).toHaveProperty('to_employee_id', testEmployeeId);
      expect(kudos[0]).toHaveProperty('message', 'Great work on the project!');
      expect(kudos[0]).toHaveProperty('timestamp', '2023-01-01T10:00:00Z');
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('kudos');
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('to_employee_id', testEmployeeId);
      expect(selectMock).toHaveBeenCalled();
    });
  });

  describe('Contribution Data Consistency', () => {
    test('should return consistent contribution data structure', async () => {
      const mockContribution = {
        id: 'uuid-999',
        tenant_id: testTenantId,
        employee_id: testEmployeeId,
        problem_solving_score: '85',
        collaboration_score: '90',
        initiative_score: '75',
        overall_score: '83',
        calculated_at: '2023-01-01T10:00:00Z'
      };

      // Mock the Supabase chain for getContributionsByEmployeeId
      const orderMock = jest.fn().mockResolvedValueOnce({ data: [mockContribution], error: null });
      const eq2Mock = jest.fn().mockReturnValue({ order: orderMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const contributions = await contributionRepository.getContributionsByEmployeeId(testTenantId, testEmployeeId);
      
      // Verify the structure matches what we expect
      expect(contributions).toHaveLength(1);
      expect(contributions[0]).toHaveProperty('employee_id', testEmployeeId);
      expect(contributions[0]).toHaveProperty('problem_solving_score', '85');
      expect(contributions[0]).toHaveProperty('collaboration_score', '90');
      expect(contributions[0]).toHaveProperty('initiative_score', '75');
      expect(contributions[0]).toHaveProperty('overall_score', '83');
      expect(contributions[0]).toHaveProperty('calculated_at', '2023-01-01T10:00:00Z');
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('contributions');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', testEmployeeId);
      expect(orderMock).toHaveBeenCalledWith('calculated_at', { ascending: false });
    });
  });
});