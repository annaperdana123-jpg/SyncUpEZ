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

// Reset modules to ensure the mock is applied before the app is imported
jest.resetModules();

const tenantRepository = require('../src/repositories/tenantRepository');

describe('Debug Tenant Repository', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should mock Supabase client correctly', async () => {
    // Mock the Supabase chain for tenant creation
    const selectMock = jest.fn().mockResolvedValueOnce({ 
      data: [{ 
        id: 'uuid-123',
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        description: 'A test tenant',
        contact_email: 'admin@test.com',
        created_at: '2023-01-01T00:00:00Z'
      }], 
      error: null 
    });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    
    require('../src/utils/supabaseClient').from.mockImplementation(fromMock);

    const result = await tenantRepository.createTenant('test-tenant', { name: 'Test Tenant' });
    
    expect(result).toEqual({ 
      id: 'uuid-123',
      tenant_id: 'test-tenant',
      name: 'Test Tenant',
      description: 'A test tenant',
      contact_email: 'admin@test.com',
      created_at: '2023-01-01T00:00:00Z'
    });
  });
});