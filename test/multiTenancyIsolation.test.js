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

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$VEMjb13lGmvtm6xVG7o0/eF0Jw9XPJJGpcQNeH6LrgA/dOC6oPrjG'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('Multi-Tenancy Isolation Tests', () => {
  const tenantAId = 'tenant-a';
  const tenantBId = 'tenant-b';
  const employeeId = 'emp-001';
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Employee Tenancy Isolation', () => {
    test('should isolate employee data between tenants', async () => {
      const employeeData = {
        employee_id: employeeId,
        name: 'Test Employee',
        email: 'test@example.com',
        department: 'Engineering',
        team: 'Backend',
        role: 'Developer',
        password: 'password123'
      };
      
      const mockEmployeeA = {
        id: 'uuid-a-123',
        tenant_id: tenantAId,
        ...employeeData
      };
      delete mockEmployeeA.password;
      
      const mockEmployeeB = {
        id: 'uuid-b-456',
        tenant_id: tenantBId,
        ...employeeData
      };
      delete mockEmployeeB.password;

      // Mock the Supabase chain for createEmployee in tenant A
      const selectMockA = jest.fn().mockResolvedValueOnce({ data: [mockEmployeeA], error: null });
      const insertMockA = jest.fn().mockReturnValue({ select: selectMockA });
      const fromMockA = jest.fn().mockReturnValue({ insert: insertMockA });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockA);

      // Create employee in tenant A
      const employeeA = await employeeRepository.createEmployee(tenantAId, employeeData);
      
      // Verify the Supabase calls for tenant A
      expect(fromMockA).toHaveBeenCalledWith('employees');
      expect(insertMockA).toHaveBeenCalled();
      expect(selectMockA).toHaveBeenCalled();
      
      // Mock the Supabase chain for createEmployee in tenant B
      const selectMockB = jest.fn().mockResolvedValueOnce({ data: [mockEmployeeB], error: null });
      const insertMockB = jest.fn().mockReturnValue({ select: selectMockB });
      const fromMockB = jest.fn().mockReturnValue({ insert: insertMockB });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockB);

      // Create employee in tenant B (same employee_id but different tenant)
      const employeeB = await employeeRepository.createEmployee(tenantBId, employeeData);
      
      // Verify the Supabase calls for tenant B
      expect(fromMockB).toHaveBeenCalledWith('employees');
      expect(insertMockB).toHaveBeenCalled();
      expect(selectMockB).toHaveBeenCalled();
      
      // Verify that both employees were created with correct tenant IDs
      expect(employeeA.tenant_id).toBe(tenantAId);
      expect(employeeB.tenant_id).toBe(tenantBId);
      
      // Mock the Supabase chain for getEmployeeById in tenant A
      const singleMockA = jest.fn().mockResolvedValueOnce({ data: mockEmployeeA, error: null });
      const eq2MockA = jest.fn().mockReturnValue({ single: singleMockA });
      const eq1MockA = jest.fn().mockReturnValue({ eq: eq2MockA });
      const selectMockGetA = jest.fn().mockReturnValue({ eq: eq1MockA });
      const fromMockGetA = jest.fn().mockReturnValue({ select: selectMockGetA });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockGetA);

      // Get employee from tenant A
      const retrievedEmployeeA = await employeeRepository.getEmployeeById(tenantAId, employeeId);
      
      // Verify tenant A employee retrieval
      expect(retrievedEmployeeA.tenant_id).toBe(tenantAId);
      expect(retrievedEmployeeA.employee_id).toBe(employeeId);
      
      // Verify the Supabase calls for tenant A retrieval
      expect(fromMockGetA).toHaveBeenCalledWith('employees');
      expect(selectMockGetA).toHaveBeenCalled();
      expect(eq1MockA).toHaveBeenCalledWith('tenant_id', tenantAId);
      expect(eq2MockA).toHaveBeenCalledWith('employee_id', employeeId);
      expect(singleMockA).toHaveBeenCalled();
      
      // Mock the Supabase chain for getEmployeeById in tenant B
      const singleMockB = jest.fn().mockResolvedValueOnce({ data: mockEmployeeB, error: null });
      const eq2MockB = jest.fn().mockReturnValue({ single: singleMockB });
      const eq1MockB = jest.fn().mockReturnValue({ eq: eq2MockB });
      const selectMockGetB = jest.fn().mockReturnValue({ eq: eq1MockB });
      const fromMockGetB = jest.fn().mockReturnValue({ select: selectMockGetB });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockGetB);

      // Get employee from tenant B
      const retrievedEmployeeB = await employeeRepository.getEmployeeById(tenantBId, employeeId);
      
      // Verify tenant B employee retrieval
      expect(retrievedEmployeeB.tenant_id).toBe(tenantBId);
      expect(retrievedEmployeeB.employee_id).toBe(employeeId);
      
      // Verify the Supabase calls for tenant B retrieval
      expect(fromMockGetB).toHaveBeenCalledWith('employees');
      expect(selectMockGetB).toHaveBeenCalled();
      expect(eq1MockB).toHaveBeenCalledWith('tenant_id', tenantBId);
      expect(eq2MockB).toHaveBeenCalledWith('employee_id', employeeId);
      expect(singleMockB).toHaveBeenCalled();
    });

    test('should prevent cross-tenant access to employee data', async () => {
      const employeeId = 'emp-001';
      const mockEmployee = {
        id: 'uuid-123',
        tenant_id: tenantAId,
        employee_id: employeeId,
        name: 'Test Employee',
        email: 'test@example.com',
        department: 'Engineering',
        team: 'Backend',
        role: 'Developer'
      };

      // Mock the Supabase chain for getEmployeeById with tenant B trying to access tenant A's employee
      // This should return null or an error because of RLS policies
      const singleMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Employee not found' } });
      const eq2Mock = jest.fn().mockReturnValue({ single: singleMock });
      const eq1Mock = jest.fn().mockReturnValue({ eq: eq2Mock });
      const selectMock = jest.fn().mockReturnValue({ eq: eq1Mock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      // Try to get tenant A's employee from tenant B (should fail)
      await expect(employeeRepository.getEmployeeById(tenantBId, employeeId))
        .rejects
        .toThrow('Employee not found');
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('employees');
      expect(selectMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('tenant_id', tenantBId); // Note: tenantBId here
      expect(eq2Mock).toHaveBeenCalledWith('employee_id', employeeId);
      expect(singleMock).toHaveBeenCalled();
    });
  });

  describe('Interaction Tenancy Isolation', () => {
    test('should isolate interaction data between tenants', async () => {
      const interactionData = {
        from_employee_id: employeeId,
        to_employee_id: employeeId,
        interaction_type: 'code_review',
        content: 'Reviewed pull request',
        timestamp: new Date().toISOString()
      };
      
      const mockInteractionA = {
        id: 'uuid-a-789',
        tenant_id: tenantAId,
        ...interactionData
      };
      
      const mockInteractionB = {
        id: 'uuid-b-012',
        tenant_id: tenantBId,
        ...interactionData
      };

      // Mock the Supabase chain for createInteraction in tenant A
      const selectMockA = jest.fn().mockResolvedValueOnce({ data: [mockInteractionA], error: null });
      const insertMockA = jest.fn().mockReturnValue({ select: selectMockA });
      const fromMockA = jest.fn().mockReturnValue({ insert: insertMockA });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockA);

      // Create interaction in tenant A
      const interactionA = await interactionRepository.createInteraction(tenantAId, interactionData);
      
      // Verify the Supabase calls for tenant A
      expect(fromMockA).toHaveBeenCalledWith('interactions');
      expect(insertMockA).toHaveBeenCalled();
      expect(selectMockA).toHaveBeenCalled();
      
      // Mock the Supabase chain for createInteraction in tenant B
      const selectMockB = jest.fn().mockResolvedValueOnce({ data: [mockInteractionB], error: null });
      const insertMockB = jest.fn().mockReturnValue({ select: selectMockB });
      const fromMockB = jest.fn().mockReturnValue({ insert: insertMockB });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockB);

      // Create interaction in tenant B (same data but different tenant)
      const interactionB = await interactionRepository.createInteraction(tenantBId, interactionData);
      
      // Verify the Supabase calls for tenant B
      expect(fromMockB).toHaveBeenCalledWith('interactions');
      expect(insertMockB).toHaveBeenCalled();
      expect(selectMockB).toHaveBeenCalled();
      
      // Verify that both interactions were created with correct tenant IDs
      expect(interactionA.tenant_id).toBe(tenantAId);
      expect(interactionB.tenant_id).toBe(tenantBId);
      
      // Mock the Supabase chain for getInteractionsByEmployeeId in tenant A
      const eq2MockA = jest.fn().mockResolvedValueOnce({ data: [mockInteractionA], error: null });
      const eq1MockA = jest.fn().mockReturnValue({ eq: eq2MockA });
      const selectMockGetA = jest.fn().mockReturnValue({ eq: eq1MockA });
      const fromMockGetA = jest.fn().mockReturnValue({ select: selectMockGetA });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockGetA);

      // Get interactions from tenant A
      const interactionsA = await interactionRepository.getInteractionsByEmployeeId(tenantAId, employeeId);
      
      // Verify tenant A interaction retrieval
      expect(interactionsA).toHaveLength(1);
      expect(interactionsA[0].tenant_id).toBe(tenantAId);
      
      // Verify the Supabase calls for tenant A retrieval
      expect(fromMockGetA).toHaveBeenCalledWith('interactions');
      expect(selectMockGetA).toHaveBeenCalled();
      expect(eq1MockA).toHaveBeenCalledWith('tenant_id', tenantAId);
      expect(eq2MockA).toHaveBeenCalledWith('to_employee_id', employeeId);
    });
  });

  describe('Kudos Tenancy Isolation', () => {
    test('should isolate kudos data between tenants', async () => {
      const kudosData = {
        from_employee_id: employeeId,
        to_employee_id: employeeId,
        message: 'Great work!',
        timestamp: new Date().toISOString()
      };
      
      const mockKudosA = {
        id: 'uuid-a-345',
        tenant_id: tenantAId,
        ...kudosData
      };
      
      const mockKudosB = {
        id: 'uuid-b-678',
        tenant_id: tenantBId,
        ...kudosData
      };

      // Mock the Supabase chain for createKudos in tenant A
      const selectMockA = jest.fn().mockResolvedValueOnce({ data: [mockKudosA], error: null });
      const insertMockA = jest.fn().mockReturnValue({ select: selectMockA });
      const fromMockA = jest.fn().mockReturnValue({ insert: insertMockA });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockA);

      // Create kudos in tenant A
      const kudosA = await kudosRepository.createKudos(tenantAId, kudosData);
      
      // Verify the Supabase calls for tenant A
      expect(fromMockA).toHaveBeenCalledWith('kudos');
      expect(insertMockA).toHaveBeenCalled();
      expect(selectMockA).toHaveBeenCalled();
      
      // Mock the Supabase chain for createKudos in tenant B
      const selectMockB = jest.fn().mockResolvedValueOnce({ data: [mockKudosB], error: null });
      const insertMockB = jest.fn().mockReturnValue({ select: selectMockB });
      const fromMockB = jest.fn().mockReturnValue({ insert: insertMockB });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockB);

      // Create kudos in tenant B (same data but different tenant)
      const kudosB = await kudosRepository.createKudos(tenantBId, kudosData);
      
      // Verify the Supabase calls for tenant B
      expect(fromMockB).toHaveBeenCalledWith('kudos');
      expect(insertMockB).toHaveBeenCalled();
      expect(selectMockB).toHaveBeenCalled();
      
      // Verify that both kudos were created with correct tenant IDs
      expect(kudosA.tenant_id).toBe(tenantAId);
      expect(kudosB.tenant_id).toBe(tenantBId);
      
      // Mock the Supabase chain for getKudosByEmployeeId in tenant A
      const eq2MockA = jest.fn().mockResolvedValueOnce({ data: [mockKudosA], error: null });
      const eq1MockA = jest.fn().mockReturnValue({ eq: eq2MockA });
      const selectMockGetA = jest.fn().mockReturnValue({ eq: eq1MockA });
      const fromMockGetA = jest.fn().mockReturnValue({ select: selectMockGetA });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockGetA);

      // Get kudos from tenant A
      const kudosListA = await kudosRepository.getKudosByEmployeeId(tenantAId, employeeId);
      
      // Verify tenant A kudos retrieval
      expect(kudosListA).toHaveLength(1);
      expect(kudosListA[0].tenant_id).toBe(tenantAId);
      
      // Verify the Supabase calls for tenant A retrieval
      expect(fromMockGetA).toHaveBeenCalledWith('kudos');
      expect(selectMockGetA).toHaveBeenCalled();
      expect(eq1MockA).toHaveBeenCalledWith('tenant_id', tenantAId);
      expect(eq2MockA).toHaveBeenCalledWith('to_employee_id', employeeId);
    });
  });

  describe('Contribution Tenancy Isolation', () => {
    test('should isolate contribution data between tenants', async () => {
      const contributionData = {
        employee_id: employeeId,
        problem_solving_score: '85',
        collaboration_score: '90',
        initiative_score: '75',
        overall_score: '83',
        calculated_at: new Date().toISOString()
      };
      
      const mockContributionA = {
        id: 'uuid-a-999',
        tenant_id: tenantAId,
        ...contributionData
      };
      
      const mockContributionB = {
        id: 'uuid-b-888',
        tenant_id: tenantBId,
        ...contributionData
      };

      // Mock the Supabase chain for createContribution in tenant A
      const selectMockA = jest.fn().mockResolvedValueOnce({ data: [mockContributionA], error: null });
      const insertMockA = jest.fn().mockReturnValue({ select: selectMockA });
      const fromMockA = jest.fn().mockReturnValue({ insert: insertMockA });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockA);

      // Create contribution in tenant A
      const contributionA = await contributionRepository.createContribution(tenantAId, contributionData);
      
      // Verify the Supabase calls for tenant A
      expect(fromMockA).toHaveBeenCalledWith('contributions');
      expect(insertMockA).toHaveBeenCalled();
      expect(selectMockA).toHaveBeenCalled();
      
      // Mock the Supabase chain for createContribution in tenant B
      const selectMockB = jest.fn().mockResolvedValueOnce({ data: [mockContributionB], error: null });
      const insertMockB = jest.fn().mockReturnValue({ select: selectMockB });
      const fromMockB = jest.fn().mockReturnValue({ insert: insertMockB });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockB);

      // Create contribution in tenant B (same data but different tenant)
      const contributionB = await contributionRepository.createContribution(tenantBId, contributionData);
      
      // Verify the Supabase calls for tenant B
      expect(fromMockB).toHaveBeenCalledWith('contributions');
      expect(insertMockB).toHaveBeenCalled();
      expect(selectMockB).toHaveBeenCalled();
      
      // Verify that both contributions were created with correct tenant IDs
      expect(contributionA.tenant_id).toBe(tenantAId);
      expect(contributionB.tenant_id).toBe(tenantBId);
      
      // Mock the Supabase chain for getContributionsByEmployeeId in tenant A
      const orderMockA = jest.fn().mockResolvedValueOnce({ data: [mockContributionA], error: null });
      const eq2MockA = jest.fn().mockReturnValue({ order: orderMockA });
      const eq1MockA = jest.fn().mockReturnValue({ eq: eq2MockA });
      const selectMockGetA = jest.fn().mockReturnValue({ eq: eq1MockA });
      const fromMockGetA = jest.fn().mockReturnValue({ select: selectMockGetA });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMockGetA);

      // Get contributions from tenant A
      const contributionsA = await contributionRepository.getContributionsByEmployeeId(tenantAId, employeeId);
      
      // Verify tenant A contribution retrieval
      expect(contributionsA).toHaveLength(1);
      expect(contributionsA[0].tenant_id).toBe(tenantAId);
      
      // Verify the Supabase calls for tenant A retrieval
      expect(fromMockGetA).toHaveBeenCalledWith('contributions');
      expect(selectMockGetA).toHaveBeenCalled();
      expect(eq1MockA).toHaveBeenCalledWith('tenant_id', tenantAId);
      expect(eq2MockA).toHaveBeenCalledWith('employee_id', employeeId);
      expect(orderMockA).toHaveBeenCalledWith('calculated_at', { ascending: false });
    });
  });
});