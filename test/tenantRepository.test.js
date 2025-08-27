// Set environment variables before importing modules
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

const tenantRepository = require('../src/repositories/tenantRepository');

// Mock Supabase client
jest.mock('../src/utils/supabaseClient', () => {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };
});

describe('Tenant Repository', () => {
  const testTenantId = 'test-tenant';
  const testTenant = {
    id: 'uuid-123',
    tenant_id: testTenantId,
    name: 'Test Tenant',
    description: 'A test tenant',
    contact_email: 'admin@test.com',
    created_at: '2023-01-01T00:00:00Z'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createTenant', () => {
    test('should create a new tenant', async () => {
      const tenantData = { 
        name: 'Test Tenant',
        description: 'A test tenant',
        contact_email: 'admin@test.com'
      };
      
      // Mock the Supabase chain
      const selectMock = jest.fn().mockResolvedValueOnce({ data: [testTenant], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await tenantRepository.createTenant(testTenantId, tenantData);
      
      expect(result).toEqual(testTenant);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('tenants');
      expect(insertMock).toHaveBeenCalledWith([{ 
        tenant_id: testTenantId,
        name: tenantData.name,
        description: tenantData.description,
        contact_email: tenantData.contact_email,
        created_at: expect.any(String)
      }]);
      expect(selectMock).toHaveBeenCalled();
    });

    test('should throw error when Supabase returns error', async () => {
      const tenantData = { name: 'Test Tenant' };
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error
      const selectMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(tenantRepository.createTenant(testTenantId, tenantData))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('getTenantById', () => {
    test('should retrieve tenant by ID', async () => {
      // Mock the Supabase chain
      const singleMock = jest.fn().mockResolvedValueOnce({ data: testTenant, error: null });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await tenantRepository.getTenantById(testTenantId);
      
      expect(result).toEqual(testTenant);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('tenants');
      expect(selectMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(singleMock).toHaveBeenCalled();
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Tenant not found';
      
      // Mock the Supabase chain with error
      const singleMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(tenantRepository.getTenantById(testTenantId))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('listTenants', () => {
    test('should retrieve all tenants', async () => {
      const mockData = [testTenant];
      
      // Mock the Supabase chain
      const selectMock = jest.fn().mockResolvedValueOnce({ data: mockData, error: null });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await tenantRepository.listTenants();
      
      expect(result).toEqual(mockData);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('tenants');
      expect(selectMock).toHaveBeenCalled();
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error
      const selectMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(tenantRepository.listTenants())
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('deleteTenant', () => {
    test('should delete tenant', async () => {
      // Mock the Supabase chain
      const selectMock = jest.fn().mockResolvedValueOnce({ data: [testTenant], error: null });
      const eqMock = jest.fn().mockReturnValue({ select: selectMock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ delete: deleteMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await tenantRepository.deleteTenant(testTenantId);
      
      expect(result).toEqual(testTenant);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('tenants');
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(selectMock).toHaveBeenCalled();
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error
      const selectMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const eqMock = jest.fn().mockReturnValue({ select: selectMock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ delete: deleteMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(tenantRepository.deleteTenant(testTenantId))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('tenantExists', () => {
    test('should return true when tenant exists', async () => {
      // Mock the Supabase chain
      const singleMock = jest.fn().mockResolvedValueOnce({ data: testTenant, error: null });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await tenantRepository.tenantExists(testTenantId);
      
      expect(result).toBe(true);
      
      // Verify the Supabase calls were made correctly
      expect(fromMock).toHaveBeenCalledWith('tenants');
      expect(selectMock).toHaveBeenCalledWith('tenant_id');
      expect(eqMock).toHaveBeenCalledWith('tenant_id', testTenantId);
      expect(singleMock).toHaveBeenCalled();
    });

    test('should return false when tenant does not exist', async () => {
      // Mock the Supabase chain for non-existent tenant
      const singleMock = jest.fn().mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      const result = await tenantRepository.tenantExists('non-existent-tenant');
      
      expect(result).toBe(false);
    });

    test('should throw error when Supabase returns error', async () => {
      const errorMessage = 'Database error';
      
      // Mock the Supabase chain with error
      const singleMock = jest.fn().mockResolvedValueOnce({ data: null, error: { message: errorMessage } });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      const fromMock = jest.fn().mockReturnValue({ select: selectMock });
      
      require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

      await expect(tenantRepository.tenantExists(testTenantId))
        .rejects
        .toThrow(errorMessage);
    });
  });
});