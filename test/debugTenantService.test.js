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

const tenantService = require('../src/services/tenantService');

describe('Debug Tenant Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should create a new tenant', async () => {
    // Mock the Supabase chain for tenantExists (should return false for new tenant)
    const singleMock1 = jest.fn().mockResolvedValueOnce({ 
      data: null,
      error: { code: 'PGRST116' } // "no rows found"
    });
    const eqMock1 = jest.fn().mockReturnValue({ single: singleMock1 });
    const selectMock1 = jest.fn().mockReturnValue({ eq: eqMock1 });
    const fromMock1 = jest.fn().mockReturnValue({ select: selectMock1 });
    
    // Mock the Supabase chain for createTenant
    const selectMock2 = jest.fn().mockResolvedValueOnce({ 
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
    const insertMock = jest.fn().mockReturnValue({ select: selectMock2 });
    const fromMock2 = jest.fn().mockReturnValue({ insert: insertMock });
    
    // Apply the mocks
    const supabase = require('../src/utils/supabaseClient');
    supabase.from.mockImplementation((table) => {
      if (table === 'tenants') {
        // For the first call to tenantExists
        if (supabase.from.mock.calls.length <= 1) {
          return fromMock1();
        } else {
          // For the second call to createTenant
          return fromMock2();
        }
      }
      return fromMock2(); // fallback
    });

    const result = await tenantService.provisionTenant('test-tenant', { name: 'Test Tenant' });
    
    expect(result).toEqual({ 
      success: true,
      tenantId: 'test-tenant',
      message: 'Tenant provisioned successfully'
    });
  });
});